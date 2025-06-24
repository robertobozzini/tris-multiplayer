import json
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal

def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')
table = dynamodb.Table('tris_pazzo_lobbies')
APIGW_ENDPOINT = "https://uc4cu1bz76.execute-api.eu-north-1.amazonaws.com/production"

apigw_management_client = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=APIGW_ENDPOINT,
    region_name='eu-north-1'
)

def send_message(connection_id, msg):
    try:
        apigw_management_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(convert_decimals(msg))
        )
    except ClientError as e:
        print("WebSocket send error:", e)

def check_win(board, symbol):
    wins = [
        [0,1,2], [3,4,5], [6,7,8],  # rows
        [0,3,6], [1,4,7], [2,5,8],  # columns
        [0,4,8], [2,4,6]            # diagonals
    ]
    return any(all(board[i] == symbol for i in combo) for combo in wins)

def lambda_handler(event, context):
    print("Evento ricevuto:", event)

    connection_id = event['requestContext']['connectionId']
    body = json.loads(event['body'])
    lobby_name = body['lobby_name']
    move = body['move']
    action = body['feedback']

    lobby_info = table.get_item(Key={"lobby_name": lobby_name})
    print("dynamo : ", lobby_info["Item"])

    game = lobby_info["Item"]
    board = game["game"]
    turn = game["turn"]

    print("Body:", body, "\nBoard:", board, "\nGame:", game)

    if connection_id not in [game["player_1"], game["player_2"]]:
        send_message(connection_id, {"result": "error", "message": "You're not part of this game"})
        return {"statusCode": 403}

    if action == "resign":
        board = ["", "", "", "", "", "", "", "", ""]
        winner = "O" if connection_id == game["player_1"] else "X"
        result = {
            "result": "feedback",
            "risultato": "win",
            "board": board,
            "winner": winner,
            "turn": turn,
            "resigned": 1
        }
        table.update_item(
            Key={"lobby_name": lobby_name},
            UpdateExpression="SET game = :g, turn = :t, stato = :s",
            ExpressionAttributeValues={
                ":g": board,
                ":t": 1,
                ":s": "finished"
            }
        )
        send_message(game["player_1"], result)
        send_message(game["player_2"], result)
        return {"statusCode": 200}

    symbol = "X" if connection_id == game["player_1"] else "O"

    if action != "resend":
        if turn != (1 if symbol == "X" else 2):
            send_message(connection_id, {"result": "error", "message": "Not your turn"})
            return {"statusCode": 400, "body": "Not your turn"}

        if not isinstance(move, int) or not 0 <= move < len(board):
            send_message(connection_id, {"result": "error", "message": "Invalid move index"})
            return {"statusCode": 400, "body": "Invalid move index"}

        if board[move] != "":
            send_message(connection_id, {"result": "error", "message": "Invalid move"})
            return {"statusCode": 400, "body": "Invalid move"}

    if action != "resend":
        board[move] = symbol
        next_turn = 2 if symbol == "X" else 1
        if check_win(board, symbol):
            result = {
                "result": "feedback",
                "risultato": "win",
                "board": board,
                "winner": symbol,
                "turn": next_turn,
                "resigned": 0
            }
            table.update_item(
                Key={"lobby_name": lobby_name},
                UpdateExpression="SET p2_status = :s, stato = :st, p1_status = :s2, game = :g, turn = :t",
                ExpressionAttributeValues={
                    ":s": "not_ready",
                    ":st": "full",
                    ":s2": "not_ready",
                    ":g": ["", "", "", "", "", "", "", "", ""],
                    ":t": 1
                }
            )
        elif "" not in board:
            result = {
                "result": "feedback",
                "risultato": "draw",
                "board": board,
                "winner": symbol,
                "turn": next_turn,
                "resigned": 0
            }
            table.update_item(
                Key={"lobby_name": lobby_name},
                UpdateExpression="SET p2_status = :s, stato = :st, p1_status = :s2, game = :g, turn = :t",
                ExpressionAttributeValues={
                    ":s": "not_ready",
                    ":st": "full",
                    ":s2": "not_ready",
                    ":g": ["", "", "", "", "", "", "", "", ""],
                    ":t": 1
                }
            )
        else:
            result = {
                "result": "feedback",
                "risultato": "continue",
                "board": board,
                "turn": next_turn,
                "resigned": 0
            }
            table.update_item(
                Key={"lobby_name": lobby_name},
                UpdateExpression="SET game = :g, turn = :t, stato = :s",
                ExpressionAttributeValues={
                    ":g": board,
                    ":t": next_turn,
                    ":s": "in_game"
                }
            )
    else:
        result = {
            "result": "feedback",
            "risultato": "continue",
            "board": board,
            "turn": turn,
            "resigned": 0
        }

    send_message(game["player_1"], result)
    send_message(game["player_2"], result)

    return {"statusCode": 200}
