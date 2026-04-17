import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
CALLSIGN_RE = re.compile(r"^[a-zA-Z0-9_]{1,20}$")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _broadcast_user_joined(domain_name: str, stage: str, callsign: str, timestamp: str, exclude_id: str) -> None:
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

    payload = json.dumps({
        "type": "system",
        "event": "user_joined",
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
        if conn_id == exclude_id:
            continue
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

    qs = event.get("queryStringParameters") or {}
    callsign: str = qs.get("callsign", "").strip()

    if not callsign or not CALLSIGN_RE.match(callsign):
        logger.warning("Rejected connection %s — bad callsign: %r", connection_id, callsign)
        return {"statusCode": 400, "body": "Invalid or missing callsign"}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        table.put_item(Item={
            "connectionId": connection_id,
            "callsign": callsign,
            "connectedAt": timestamp,
        })
    except ClientError as exc:
        logger.error("DynamoDB PutItem failed: %s", exc)
        return {"statusCode": 500, "body": "Internal server error"}

    try:
        _broadcast_user_joined(domain_name, stage, callsign, timestamp, exclude_id=connection_id)
    except Exception as exc:
        logger.warning("user_joined broadcast failed: %s", exc)

    logger.info("Connected %s as %s", connection_id, callsign)
    return {"statusCode": 200, "body": "Connected"}
