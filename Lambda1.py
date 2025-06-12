import json
import boto3

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table = dynamodb.Table('nome_da_inserire_dynamodb')

def lambda_handler(event, context):
    #websocket
    print(event)
    connection_id = event['requestContext']['connectionId']

    #quando un utente si connette mettiamo il suo id come pk, poi il nickname e infine lo stato per vedere se è pronto: 1 si 0 no
    table.put_item(Item={'pk':connection_id,'nickname':"gino",'stato':0})

    table.delete_item(Item={'pk':connection_id,'nickname':"gino",'stato':1})
    
    return {'statusCode': 200}
