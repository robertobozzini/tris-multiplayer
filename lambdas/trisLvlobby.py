import json
import boto3
import time
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')
table_lobby = dynamodb.Table('tris_pazzo_lobbies')

APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

apigw_management_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=APIGW_ENDPOINT,
    region_name='eu-north-1'
)

def lambda_handler(event, context):
    print("Evento ricevuto:", event)

    connection_id = str(event['requestContext']['connectionId'])
    item = table_users.get_item(Key={'connectionId': connection_id}).get('Item', {})
    print("item1ff:", item)

    idl = str(item['idlobby'])
    table_users.update_item(
        Key={'connectionId': connection_id},
        UpdateExpression='SET idlobby = :newid',
        ExpressionAttributeValues={':newid': ''}
    )

    item2 = table_lobby.get_item(Key={'lobby_name': idl}).get('Item', {})
    print("item2ff:", item2)

    pl = item2['players']
    if pl == 1 or pl == 0:
        print("unico player nella lobby")
        tm = round(time.time()) + 60
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET expireAt = :nuovoexp',
            ExpressionAttributeValues={':nuovoexp': tm}
        )
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET players = :newpl, stato= :ns',
            ExpressionAttributeValues={':newpl': 0, ':ns': 'waiting'}
        )
    else:
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET players = :newpl, stato= :ns',
            ExpressionAttributeValues={':newpl': 1, ':ns': 'waiting'}
        )

    if item2['player_1'] == connection_id:
        if item2['player_2'] != '':
            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET player_1 = :id1, player_2 = :id2, p1_status = :ps1',
                ExpressionAttributeValues={
                    ':id1': item2['player_2'],
                    ':id2': '',
                    ':ps1': 'not_ready',
                }
            )
            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET p2_status = :ps1',
                ExpressionAttributeValues={':ps1': 'not_ready'}
            )
        else:
            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET player_1 = :id1, p1_status = :ps1',
                ExpressionAttributeValues={
                    ':id1': '',
                    ':ps1': 'not_ready'
                }
            )
            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET p2_status = :ps1',
                ExpressionAttributeValues={':ps1': 'not_ready'}
            )

    elif item2['player_2'] == connection_id:
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET player_2 = :id2, p2_status = :ps2',
            ExpressionAttributeValues={
                ':id2': '',
                ':ps2': 'not_ready',
            }
        )
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET p1_status = :ps2',
            ExpressionAttributeValues={':ps2': 'not_ready'}
        )

    item2 = table_lobby.get_item(Key={'lobby_name': idl}).get('Item', {})
    print("Stato lobby dopo aggiornamenti:", item2)

    if item2['player_1'] in [None, '', 'None'] and item2['player_2'] in [None, '', 'None']:
        table_lobby.update_item(
            Key={'lobby_name': idl},
            UpdateExpression='SET players = :zero, stato = :waiting, player_1 = :emp, player_2 = :emp',
            ExpressionAttributeValues={
                ':zero': 0,
                ':waiting': 'waiting',
                ':emp': ''
            }
        )
        print("Lobby pulita: nessun giocatore attivo.")

    pl1 = str(item2['player_1'])
    if pl1 not in ['', 'None', None]:
        item3 = table_users.get_item(Key={"connectionId": pl1}).get('Item', {})
        print("item3ff:", item3)
        nick1 = item3['nickname']

        dat = {
            "result": "lobbyupdate",
            "message": f"Joined lobby '{idl}' successfully",
            "lobby": idl,
            "player1": nick1,
            "player2": '',
        }
        try:
            apigw_management_client.post_to_connection(
                ConnectionId=pl1,
                Data=json.dumps(dat).encode('utf-8')
            )
        except ClientError as e:
            print("WebSocket send error:", e)

    return {"statusCode": 200}
