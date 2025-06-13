import boto3
import json

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table = dynamodb.Table('tris_pazzo_lobbies')

def lambda_handler(event, context):
    # Esegue lo scan sulla tabella con projection per ridurre i dati letti
    response = table.scan(
        ProjectionExpression="lobby_name, players, status"
    )
    items = response.get('Items', [])
    
    # Costruisce la lista di lobby con i campi desiderati
    lobbies = []
    for item in items:
        pw=item.get("password")
        if(pw==""): val=0
        else: val=1
        lobby = {
            "lobby_name": item.get("lobby_name"),
            "players": item.get("players"),
            "status": item.get("status"),
            "private":val
        }
        lobbies.append(lobby)
        
    # Ordina la lista in base a 'elemento2' in ordine crescente
    lobbies.sort(key=lambda x: x["players"])  # Assumendo che elemento2 sia un intero
    
    # Prepara il risultato in formato JSON/dict
    result = {
        "lobbies": lobbies
    }
    
    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }