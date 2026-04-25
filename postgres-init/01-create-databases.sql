SELECT 'CREATE DATABASE campaign_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'campaign_db')\gexec

SELECT 'CREATE DATABASE stratification_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'stratification_db')\gexec

SELECT 'CREATE DATABASE communication_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'communication_db')\gexec

SELECT 'CREATE DATABASE engagement_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'engagement_db')\gexec

SELECT 'CREATE DATABASE analytics_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'analytics_db')\gexec
