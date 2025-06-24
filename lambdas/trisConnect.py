import json
import boto3
from botocore.exceptions import ClientError

# Connessione a DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')
table_lobbies = dynamodb.Table('tris_pazzo_lobbies')

APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

apigw_management_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=APIGW_ENDPOINT,
    region_name='eu-north-1'
)

# Lambda Handler
def lambda_handler(event, context):
    print("Evento ricevuto:", event)
    idstanza = ""
    connection_id = event['requestContext']['connectionId']

    def send_message(msg):
        try:
            apigw_management_client.post_to_connection(
                ConnectionId=connection_id,
                Data=json.dumps(msg).encode('utf-8')
            )
        except ClientError as e:
            print("WebSocket send error:", e)

    try:
        body = json.loads(event["body"])
        nickname = body.get('nickname', '').strip()
        oldId = body.get('oldId', '').strip()
    except (KeyError, json.JSONDecodeError) as e:
        print("Errore nel parsing del body:", e)
        return {"statusCode": 400, "body": "Bad request"}

    if not nickname:
        print("Nickname mancante, abort.")
        return {"statusCode": 400, "body": "Nickname obbligatorio"}

    if oldId != '':
        response = table_users.get_item(Key={'connectionId': oldId})
        if 'Item' in response:
            item = response['Item']
            print('ITEM-OLD:::: ', item)
            table_users.update_item(
                Key={'connectionId': oldId},
                UpdateExpression='SET removel = :tmp',
                ExpressionAttributeValues={':tmp': False}
            )

            idstanza = item['idlobby']
            if idstanza != '':
                iteml = table_lobbies.get_item(Key={'lobby_name': idstanza})['Item']
                cond = True

                if iteml['player_2'] == '':
                    send_message({
                        "result": "joined",
                        "message": f"Joined lobby '{idstanza}' successfully",
                        "lobby": idstanza,
                        "player1": nickname,
                        "player2": ""
                    })
                    cond = False
                c = ''
                if iteml['player_1'] == oldId:
                    table_lobbies.update_item(
                        Key={'lobby_name': idstanza},
                        UpdateExpression='SET player_1 = :tmp, p1_status = :p1s, p2_status = :p2s',
                        ExpressionAttributeValues={
                            ':tmp': connection_id,
                            ':p1s': 'not_ready',
                            ':p2s': 'not_ready',
                        }
                    )
                    c = iteml['player_2']
                    if cond:
                        pl1 = iteml['player_2']
                        tmp = table_users.get_item(Key={'connectionId': pl1})['Item']
                        print('TMP:::: ', tmp)
                        send_message({
                            "result": "joined",
                            "message": f"Joined lobby '{idstanza}' successfully",
                            "lobby": idstanza,
                            "player1": nickname,
                            "player2": tmp['nickname'],
                        })

                elif iteml['player_2'] == oldId:
                    table_lobbies.update_item(
                        Key={'lobby_name': idstanza},
                        UpdateExpression='SET player_2 = :tmp, p2_status = :p1s, p1_status = :p2s',
                        ExpressionAttributeValues={
                            ':tmp': connection_id,
                            ':p1s': 'not_ready',
                            ':p2s': 'not_ready',
                        }
                    )
                    c = iteml['player_1']
                    if cond:
                        pl1 = iteml['player_1']
                        tmp = table_users.get_item(Key={'connectionId': pl1})['Item']
                        print('TMP:::: ', tmp)
                        send_message({
                            "result": "joined",
                            "message": f"Joined lobby '{idstanza}' successfully",
                            "lobby": idstanza,
                            "player1": tmp['nickname'],
                            "player2": nickname,
                        })

                if cond and c != '':
                    dat = {
                        'result': 'ready',
                        'isReady': False,
                        'player': nickname
                    }

                    try:
                        apigw_management_client.post_to_connection(
                            ConnectionId=c,
                            Data=json.dumps(dat).encode('utf-8')
                        )
                    except ClientError as e:
                        print("WebSocket send error:", e)

                    nick2 = table_users.get_item(Key={'connectionId': c})['Item']['nickname']
                    dat = {
                        'result': 'ready',
                        'isReady': False,
                        'player': nick2
                    }

                    try:
                        apigw_management_client.post_to_connection(
                            ConnectionId=c,
                            Data=json.dumps(dat).encode('utf-8')
                        )
                    except ClientError as e:
                        print("WebSocket send error:", e)

    dat = {
        'result': 'connection',
        'val': str(connection_id)
    }
    try:
        apigw_management_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(dat).encode('utf-8')
        )
    except ClientError as e:
        print("WebSocket send error:", e)

    table_users.put_item(Item={
        'connectionId': connection_id,
        'nickname': nickname,
        'idlobby': idstanza,
        'removel': False
    })

    return {"statusCode": 200}
