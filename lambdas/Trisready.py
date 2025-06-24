import json
import boto3
from botocore.exceptions import ClientError
import time

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')
table = dynamodb.Table('tris_pazzo_lobbies')
APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

apigw_management_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=APIGW_ENDPOINT,
    region_name='eu-north-1'
)

def lambda_handler(event, context):
    body = json.loads(event["body"])
    action = body["richiesta"]
    print("ACTION: ", action)
    player = body["player"]
    

    c1 = event["requestContext"]["connectionId"]

    if action is True:
        print("DENTRO")
        item = table_users.get_item(Key={"connectionId": c1})
        print('ITEM:: ', item)
        item=item["Item"]
        idl = item["idlobby"]
        item2 = table.get_item(Key={"lobby_name": idl})
        print('LOBBY::: ', item2)
        item2 = item2["Item"]
        p1 = item2["player_1"]

        if p1 == c1:  # sei il player1
            item3 = table_users.get_item(Key={"connectionId": item2["player_2"]})["Item"]
            msg = item2["p2_status"] != "not_ready"
            dat = {
                "result": "ready",
                "isReady": msg,
                "player": item3["nickname"]
            }
        else:  # sei il player2
            item3 = table_users.get_item(Key={"connectionId": p1})["Item"]
            msg = item2["p1_status"] != "not_ready"
            dat = {
                "result": "ready",
                "isReady": msg,
                "player": item3["nickname"]
            }

        try:
            apigw_management_client.post_to_connection(
                ConnectionId=c1,
                Data=json.dumps(dat).encode("utf-8")
            )
        except ClientError as e:
            print("WebSocket send error:", e)

        return {
            "statusCode": 200,
            "body": json.dumps("Hello from Lambda!")
        }

    else:
        rs = body["isReady"]
        dat = {
            "result": "ready",
            "isReady": rs,
            "player": player
        }
        item = table_users.get_item(Key={"connectionId": c1})["Item"]
        idl = item["idlobby"]
        item2 = table.get_item(Key={"lobby_name": idl})["Item"]
        p1 = item2["player_1"]

        if p1 == c1:  # sei il player 1
            c2 = item2["player_2"]
            stato = "ready" if rs is True else "not_ready"
            table.update_item(
                Key={"lobby_name": idl},
                UpdateExpression="SET p1_status = :id2",
                ExpressionAttributeValues={":id2": stato}
            )
        else:
            c2 = p1
            stato = "ready" if rs is True else "not_ready"
            table.update_item(
                Key={"lobby_name": idl},
                UpdateExpression="SET p2_status = :id2",
                ExpressionAttributeValues={":id2": stato}
            )

        try:
            apigw_management_client.post_to_connection(
                ConnectionId=c1,
                Data=json.dumps(dat).encode("utf-8")
            )
        except ClientError as e:
            print("WebSocket send error:", e)

        try:
            apigw_management_client.post_to_connection(
                ConnectionId=c2,
                Data=json.dumps(dat).encode("utf-8")
            )
        except ClientError as e:
            print("WebSocket send error:", e)

        return {
            "statusCode": 200,
            "body": json.dumps("Hello from Lambda!")
        }
