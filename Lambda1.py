import json
import boto3

# Connessione a DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table_users = dynamodb.Table('tris_pazzo_utenti')

# Funzione per aggiungere utente a DynamoDB con il modello richiesto
def add_user(connection_id, nickname,idstanza):
    table_users.put_item(Item={'connectionId': connection_id, 'nickname': nickname,'id_stanza':idstanza})
    return {"status": "Utente aggiunto con successo"}

# Lambda Handler
def lambda_handler(event, context):
    print("Evento ricevuto:", event)

    # Recupera l'ID della connessione WebSocket
    connection_id = event['requestContext']['connectionId']
    body = json.loads(event.get("body", "{}"))
    nickname = body['data'['nickname']]
    idstanza = body['data'['id_stanza']]
    add_user(connection_id, nickname,idstanza)

    return {"statusCode": 200}
