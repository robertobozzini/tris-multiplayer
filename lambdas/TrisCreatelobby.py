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
    body = json.loads(event["body"])
    nickname = body['player1']
    lobby_name = body['lobby_name'].lower()
    pw = body['password']

    if len(str(lobby_name)) > 20:
        return {"statusCode": 400, "body": "Lobby name too long"}

    lobby = {
        'lobby_name': lobby_name,
        "game": ["", "", "", "", "", "", "", "", ""],
        'p1_status': 'not_ready',
        'p2_status': 'not_ready',
        'password': pw,
        'player_1': connection_id,
        'player_2': '',
        'players': 1,
        'stato': 'waiting',
        'turn': 1
    }

    try:
        table.put_item(
            Item=lobby,
            ConditionExpression='attribute_not_exists(lobby_name)'
        )
        print("Lobby created.")

        table_users.update_item(
            Key={'connectionId': connection_id},
            UpdateExpression='SET idlobby = :l',
            ExpressionAttributeValues={':l': lobby_name}
        )
        print("User updated with lobby name.")

    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            print("Lobby already exists.")

            result = {"result": "Lobby name already taken"}
            data = json.dumps(result).encode('utf-8')

            apigw_management_client = boto3.client(
                'apigatewaymanagementapi',
                endpoint_url=APIGW_ENDPOINT,
                region_name='eu-north-1'
            )

            try:
                apigw_management_client.post_to_connection(
                    ConnectionId=connection_id,
                    Data=data
                )
            except ClientError as e:
                print("WebSocket send error:", e)

            return {"statusCode": 400, "body": "Lobby name already taken"}
        else:
            print("DynamoDB error:", e)
            return {"statusCode": 500, "body": "DynamoDB error"}

    result = {"result": "joined", "player1": nickname, "lobby": lobby_name}
    data = json.dumps(result).encode('utf-8')

    apigw_management_client = boto3.client(
        'apigatewaymanagementapi',
        endpoint_url=APIGW_ENDPOINT,
        region_name='eu-north-1'
    )

    try:
        apigw_management_client.post_to_connection(
            ConnectionId=connection_id,
            Data=data
        )
    except ClientError as e:
        print("WebSocket send error:", e)

    return {"statusCode": 200}
