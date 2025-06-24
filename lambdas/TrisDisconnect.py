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
    
    response = table_users.get_item(Key={'connectionId': connection_id})
    if 'Item' not in response:
        
        print("Nessun item trovato, probabilmente già rimosso.")
        return {"statusCode": 200}

    # Set removel=True
    table_users.update_item(
        Key={'connectionId': connection_id},
        UpdateExpression='SET removel = :tmp',
        ExpressionAttributeValues={':tmp': True}
    )

    time.sleep(5)
    response = table_users.get_item(Key={'connectionId': connection_id})
    if 'Item' not in response:
        
        print("Nessun item trovato, probabilmente già rimosso.")
        return {"statusCode": 200}

    item = response['Item']
    print("item1ff:", item)

    if not item.get('removel', False):
        table_users.delete_item(Key={'connectionId': connection_id})
        print("removel è False, quindi non eseguire il disconnect.")
        return {"statusCode": 200}


    idl = item['idlobby']

    if idl != '' and idl is not None:
        idl = str(idl)
        item2 = table_lobby.get_item(Key={'lobby_name': idl})['Item']
        print("item2ff:", item2)

        pl = item2['players']

        if pl in [0, 1]:
            print("unico player nella lobby")
            expire_ts = round(time.time()) + 60

            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET expireAt = :nuovoexp',
                ExpressionAttributeValues={':nuovoexp': expire_ts}
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
                        ':ps1': 'not_ready'
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
                    ExpressionAttributeValues={':id1': '', ':ps1': 'not_ready'}
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
                ExpressionAttributeValues={':id2': '', ':ps2': 'not_ready'}
            )
            table_lobby.update_item(
                Key={'lobby_name': idl},
                UpdateExpression='SET p1_status = :ps2',
                ExpressionAttributeValues={':ps2': 'not_ready'}
            )

        item2 = table_lobby.get_item(Key={'lobby_name': idl})['Item']
        pl1 = str(item2['player_1'])

        if pl1 != '':
            item3 = table_users.get_item(Key={"connectionId": pl1})['Item']
            print("item3ff:", item3)
            nick1 = item3['nickname']

            dat = {
                "result": "lobbyupdate",
                "message": f"Joined lobby '{idl}' successfully",
                "lobby": idl,
                "player1": nick1,
                "player2": ''
            }

            try:
                apigw_management_client.post_to_connection(
                    ConnectionId=pl1,
                    Data=json.dumps(dat).encode('utf-8')
                )
            except ClientError as e:
                print("WebSocket send error:", e)

    # Finally, delete the user connection
    table_users.delete_item(Key={'connectionId': connection_id})

    return {"statusCode": 200}
