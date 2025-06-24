import boto3
import json

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table = dynamodb.Table('tris_pazzo_lobbies')
table_users = dynamodb.Table('tris_pazzo_utenti')
APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

def lambda_handler(event, context):
    print(event)
    try:
        connectionid = event['requestContext']['connectionId']
    except KeyError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "La richiesta non contiene requestContext.connectionId"})
        }

    response = table.scan(
        ProjectionExpression="lobby_name, players, stato, password"
    )

    items = response['Items']  # Assuming 'Items' always exists

    lobbies = []

    for item in items:
        pw = item['password']
        val = "0" if pw == "" else "1"
        lobby = {
            "lobby_name": item['lobby_name'],
            "players": str(item['players']),
            "stato": item['stato'],
            "private": val
        }
        lobbies.append(lobby)
    response = table_users.scan(
        ProjectionExpression="connectionId, nickname, idlobby"
    )
    items = response['Items']  # Assuming 'Items' always exists

    users = []

    for item in items:
        
        
        user = {
            "nickname": item['nickname'],
            "idlobby": item['idlobby']
        }
        users.append(user)
    lobbies.sort(key=lambda x: x["players"])
    users.sort(key=lambda x: x["nickname"])
    result = {
        "lobbies": lobbies,
        "users":users
    }
    data = json.dumps(result).encode('utf-8')

    apigw_management_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=APIGW_ENDPOINT,
        region_name='eu-north-1'
    )
    apigw_management_client.post_to_connection(
        ConnectionId=connectionid,
        Data=data
    )

    result = {
        "result":"namelist",
        "users":users
    }
    data = json.dumps(result).encode('utf-8')

    apigw_management_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=APIGW_ENDPOINT,
        region_name='eu-north-1'
    )
    apigw_management_client.post_to_connection(
        ConnectionId=connectionid,
        Data=data
    )
    return {
        "statusCode": 200,
    }
