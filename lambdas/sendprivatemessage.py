import boto3
import json

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('tris_pazzo_lobbies')
table_users = dynamodb.Table('tris_pazzo_utenti')

APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"
apigw = boto3.client('apigatewaymanagementapi', endpoint_url=APIGW_ENDPOINT)
s3 = boto3.client('s3')

BUCKET = "chatris"

def send_ws(dest_id, last_20_list, n):
    msg = {
        "result": "chat",
        "private": True,
        "number": n,
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
    lobby_name = body.get("lobby_name")
    number = body.get("number")
    KEY = f"chat_{lobby_name}.txt"

    if not msg_text:
        return {"statusCode": 400, "body": "Missing message content"}

    lobby_item = table.get_item(Key={"lobby_name": lobby_name})["Item"]
    user1 = lobby_item.get("player_1")
    name1 =  table_users.get_item(Key={"connectionId": user1})["Item"]["nickname"]

    try:
        user2 = lobby_item.get("player_2")
        name2 =  table_users.get_item(Key={"connectionId": user2})["Item"]["nickname"]
    except Exception as e:
        print("Errore nel recuperare l'utente2:", e)
        user2 = None

    if user2 == None:
        name2 = None
    
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=KEY)
        lines = obj["Body"].read().decode("utf-8").splitlines()
    except s3.exceptions.NoSuchKey:
        lines = []

    new_entry = f"{name1 if conn_id == user1 else name2}: {msg_text}"
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

    payload = json.dumps(last_20).encode("utf-8")

    send_ws(user1, last_20, number)
    send_ws(user2, last_20, number) if name2 != None else None

    return {"statusCode": 200}