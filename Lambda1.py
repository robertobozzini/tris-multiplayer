import json
import boto3

dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
table = dynamodb.Table('nome_da_inserire_dynamodb')

def lambda_handler(event, context):
    #websocket
    print(event)
    connection_id = event['requestContext']['connectionId']
    table.put_item(Item={'pk':'connection','sk':connection_id})
    table.delete_item(Item={'pk':'connection','sk':connection_id})
    
    return {'statusCode': 200}
