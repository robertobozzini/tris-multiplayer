import boto3
import time
from datetime import datetime
import functools

print = functools.partial(print, flush=True)

TABLE_NAME = 'tris_pazzo_lobbies'
TIMESTAMP_FIELD = 'expireAt'

def delete_expired_items():
    now = int(time.time())
    dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
    table = dynamodb.Table(TABLE_NAME)

    scan_kwargs = {
        'FilterExpression': f"{TIMESTAMP_FIELD} <= :now",
        'ExpressionAttributeValues': {':now': now}
    }

    expired_items = table.scan(**scan_kwargs).get('Items', [])

    for item in expired_items:
        key = {k['AttributeName']: item[k['AttributeName']] for k in table.key_schema}
        print(f"Deleting: {key}")
        table.delete_item(Key=key)

if __name__ == "__main__":
    while True:
        print(f"[{datetime.now()}] Checking for expired items...")
        delete_expired_items()
        time.sleep(60)