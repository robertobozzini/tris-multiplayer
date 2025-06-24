import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')
table = dynamodb.Table('tris_pazzo_lobbies')
APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

def lambda_handler(event, context):
    print("Evento ricevuto:", event)
    
    connection_id = event['requestContext']['connectionId']
    body = json.loads(event.get("body", "{}"))
    nickname = body['player']
    lobby_name = body['lobby_name'].lower()
    pw = body['password']

    apigw_management_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=APIGW_ENDPOINT,
        region_name='eu-north-1'
    )

    def send_message(msg):
        try:
            apigw_management_client.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps(msg).encode('utf-8')
            )
        except ClientError as e:
            print("WebSocket send error:", e)

    try:
        response = table.get_item(Key={"lobby_name": lobby_name})
    except ClientError as e:
        print("DynamoDB error:", e.response['Error']['Message'])
        send_message({"result": "error", "message": "Internal server error"})
        return {"statusCode": 500}

    if 'Item' not in response:
        print("Lobby not found.")
        send_message({"result": "error", "message": "Lobby does not exist"})
        return {"statusCode": 400}
    
    lobby = response['Item']
    
    if lobby['players'] == 2:
        send_message({"result": "error", "message": "Lobby is full"})
        return {"statusCode": 400}
    
    if lobby['password'] != pw:
        send_message({"result": "error", "message": "Wrong password"})
        return {"statusCode": 400}
        
    try:
        table_users.update_item(
            Key={'connectionId': connection_id},
            UpdateExpression='SET idlobby = :l',
            ExpressionAttributeValues={':l': lobby_name}
        )

        if lobby['player_1'] == '':
            table.update_item(
                Key={'lobby_name': lobby_name},
                UpdateExpression="SET player_1 = :p2, p1_status = :s, stato = :st, players = :pl, p2_status = :s2, game = :g, turn = :t  REMOVE expireAt",
                ExpressionAttributeValues={
                    ':p2': connection_id,
                    ':s': 'not_ready',
                    ':st': 'waiting',
                    ':pl': lobby['players'] + 1,
                    ':s2': 'not_ready',
                    ':g': ["", "", "", "", "", "", "", "", ""],
                    ':t': 1
                }
            )
            send_message({
                "result": "joined",
                "message": f"Joined lobby '{lobby_name}' successfully",
                "lobby": lobby_name,
                "player1": nickname,
                "player2": ""
            })
        else:
            table.update_item(
                Key={'lobby_name': lobby_name},
                UpdateExpression="SET player_2 = :p2, p2_status = :s, stato = :st, players = :pl, p1_status = :s2, game = :g, turn = :t  REMOVE expireAt",
                ExpressionAttributeValues={
                    ':p2': connection_id,
                    ':s': 'not_ready',
                    ':st': 'full',
                    ':pl': lobby['players'] + 1,
                    ':s2': 'not_ready',
                    ':g': ["", "", "", "", "", "", "", "", ""],
                    ':t': 1
                }
            )  
            pl1 = lobby['player_1']
            item = table_users.get_item(Key={'connectionId': pl1})['Item']
            print("COSA CHE DA NONE: ", item)

            send_message({
                "result": "joined",
                "message": f"Joined lobby '{lobby_name}' successfully",
                "lobby": lobby_name,
                "player1": item['nickname'],
                "player2": nickname
            })

            dat = {
                "result": "lobbyupdate",
                "message": f"Joined lobby '{lobby_name}' successfully",
                "lobby": lobby_name,
                "player1": item['nickname'],
                "player2": nickname
            }

            try:
                apigw_management_client.post_to_connection(
                    ConnectionId=pl1,
                    Data=json.dumps(dat).encode('utf-8')
                )
            except ClientError as e:
                print("WebSocket send error:", e)

        table.update_item(
            Key={'lobby_name': lobby_name},
            UpdateExpression='REMOVE expireAt'
        )

    except ClientError as e:
        print("DynamoDB update error:", e)
        send_message({"result": "error", "message": "Database update failed"})
        return {"statusCode": 500}

    return {"statusCode": 200}
