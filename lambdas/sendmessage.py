import boto3
import json

dynamodb = boto3.resource('dynamodb')
table_users = dynamodb.Table('tris_pazzo_utenti')

APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"
apigw = boto3.client('apigatewaymanagementapi', endpoint_url=APIGW_ENDPOINT)
s3 = boto3.client('s3')

BUCKET = "chatris"
KEY = "Juan.txt"

def send_ws(dest_id, last_20_list):
    msg = {
        "result": "chat",
        "private": False,
        "messages": last_20_list     
    }
    try:
        apigw.post_to_connection(
            ConnectionId=dest_id,
            Data=json.dumps(msg).encode("utf-8")   
        )
    except Exception as e:
        print(f"Errore WebSocket verso {dest_id}: {e}")


def lambda_handler(event, context):
    print("Evento ricevuto:", event)

    conn_id = event["requestContext"]["connectionId"]
    body = json.loads(event.get("body", "{}"))
    msg_text = body.get("msg")

    if not msg_text:
        return {"statusCode": 400, "body": "Missing message content"}

    try:
        user = table_users.get_item(Key={"connectionId": conn_id})["Item"]
        nickname = user["nickname"]
    except Exception as e:
        print("Errore nel recuperare l'utente:", e)
        return {"statusCode": 500, "body": "Errore nel recuperare l'utente"}

    try:
        obj = s3.get_object(Bucket=BUCKET, Key=KEY)
        lines = obj["Body"].read().decode("utf-8").splitlines()
    except s3.exceptions.NoSuchKey:
        lines = []

    new_entry = f"{nickname}: {msg_text}"
    lines.append(new_entry)

    last_20 = lines[-20:]

    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=KEY,
            Body="\n".join(last_20).encode("utf-8")
        )
    except Exception as e:
        print("Errore scrivendo su S3:", e)
        return {"statusCode": 500, "body": "Errore scrittura S3"}

    try:
        all_users = table_users.scan().get("Items", [])
    except Exception as e:
        print("Errore durante la scansione degli utenti:", e)
        return {"statusCode": 500, "body": "Errore nella scansione DynamoDB"}

    payload = json.dumps(last_20).encode("utf-8")
    for u in all_users:
        send_ws(u["connectionId"], last_20)


    return {"statusCode": 200, "body": "Messaggio inviato a tutti"}
