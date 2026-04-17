import json
import logging
import os
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def handler(event: dict, context: object) -> dict:
    ctx = event.get("requestContext", {})
    connection_id: str = ctx.get("connectionId", "")
    domain_name: str = ctx.get("domainName", "")
    stage: str = ctx.get("stage", "prod")

    # Parse and validate body
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return {"statusCode": 400, "body": "Invalid JSON body"}

    text = body.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return {"statusCode": 400, "body": "Missing or invalid text"}
    if len(text) > 1000:
        return {"statusCode": 400, "body": "Missing or invalid text"}
    text = text.strip()

    # Get sender's callsign from DynamoDB (prevents spoofing)
    try:
        resp = table.get_item(Key={"connectionId": connection_id})
        sender = resp.get("Item")
    except ClientError as exc:
        logger.error("GetItem failed: %s", exc)
        return {"statusCode": 500, "body": "Internal server error"}

    if not sender:
        return {"statusCode": 400, "body": "Unknown sender"}

    callsign: str = sender["callsign"]
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = json.dumps({
        "type": "message",
        "callsign": callsign,
        "text": text,
        "timestamp": timestamp,
    }).encode("utf-8")

    # Scan all active connections (with pagination)
    try:
        connections = []
        scan_kwargs: dict = {"ProjectionExpression": "connectionId"}
        while True:
            resp = table.scan(**scan_kwargs)
            connections.extend(resp.get("Items", []))
            if "LastEvaluatedKey" not in resp:
                break
            scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]
    except ClientError as exc:
        logger.error("DynamoDB scan failed: %s", exc)
        return {"statusCode": 500, "body": "Internal server error"}

    # Fan-out broadcast
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    for conn in connections:
        conn_id = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=conn_id, Data=payload)
        except apigw.exceptions.GoneException:
            logger.info("Removing stale connection: %s", conn_id)
            table.delete_item(Key={"connectionId": conn_id})
        except Exception as exc:
            logger.error("Failed to send to %s: %s", conn_id, exc)

    logger.info("%s sent message to %d connections", callsign, len(connections))
    return {"statusCode": 200, "body": "Message sent"}
