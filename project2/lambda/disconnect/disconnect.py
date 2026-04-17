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


def _broadcast_user_left(domain_name: str, stage: str, callsign: str, timestamp: str) -> None:
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    payload = json.dumps({
        "type": "system",
        "event": "user_left",
        "callsign": callsign,
        "timestamp": timestamp,
    }).encode("utf-8")

    connections = []
    scan_kwargs: dict = {"ProjectionExpression": "connectionId"}
    while True:
        resp = table.scan(**scan_kwargs)
        connections.extend(resp.get("Items", []))
        if "LastEvaluatedKey" not in resp:
            break
        scan_kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    for conn in connections:
        conn_id = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=conn_id, Data=payload)
        except apigw.exceptions.GoneException:
            table.delete_item(Key={"connectionId": conn_id})
        except Exception as exc:
            logger.warning("broadcast to %s failed: %s", conn_id, exc)


def handler(event: dict, context: object) -> dict:
    ctx = event.get("requestContext", {})
    connection_id: str = ctx.get("connectionId", "")
    domain_name: str = ctx.get("domainName", "")
    stage: str = ctx.get("stage", "prod")

    # Get callsign before deleting (for broadcast)
    try:
        resp = table.get_item(Key={"connectionId": connection_id})
        callsign: str = resp.get("Item", {}).get("callsign", "unknown")
    except ClientError as exc:
        logger.warning("GetItem failed for %s: %s", connection_id, exc)
        callsign = "unknown"

    # Delete the connection record
    try:
        table.delete_item(Key={"connectionId": connection_id})
    except ClientError as exc:
        logger.error("DeleteItem failed for %s: %s", connection_id, exc)
        return {"statusCode": 500, "body": "Internal server error"}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        _broadcast_user_left(domain_name, stage, callsign, timestamp)
    except Exception as exc:
        logger.warning("user_left broadcast failed: %s", exc)

    logger.info("Disconnected %s (was %s)", connection_id, callsign)
    return {"statusCode": 200, "body": "Disconnected"}
