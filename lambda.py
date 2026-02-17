import json
import boto3
import os
import urllib.parse

# Get SNS Topic ARN from environment variable (recommended)
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

s3 = boto3.client('s3')
sns = boto3.client('sns') if SNS_TOPIC_ARN else None

def lambda_handler(event, context):

    for record in event['Records']:
        
        # Get bucket and object key
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        
        # Read the S3 object
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        
        # Log full content to CloudWatch
        print(f"\n===== New Log File Detected =====")
        print(f"Bucket: {bucket}")
        print(f"Key: {key}")
        print("Log Content:\n")
        print(content)
        print("=================================\n")
        
        # Send SNS alert (if configured)
        if sns:
            message = f"""
🚨 Honeypot Activity Detected!

Bucket: {bucket}
Log File: {key}

Log file has been processed successfully.
Check CloudWatch for full details.
"""
            sns.publish(
                TopicArn=SNS_TOPIC_ARN,
                Subject="Honeypot Alert",
                Message=message
            )

    return {
        'statusCode': 200,
        'body': json.dumps('Log processed and alert sent successfully')
    }
