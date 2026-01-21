/**
 * AWS Lambda関数サンプル
 * API Gateway + Lambda + DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'LocationRecords';

// 許可するオリジンのリスト
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',
  'http://localhost:3001',
  'https://basho.penpale.jp',
  'https://d3rzmi1o2ez2uk.cloudfront.net'
];

// CORS ヘッダーを動的に生成
const getCorsHeaders = (origin) => {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };
};

/**
 * メインハンドラー
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // リクエスト元のオリジンを取得
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getCorsHeaders(origin);

  // OPTIONSリクエスト（CORS プリフライト）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // ユーザーIDを取得（Cognito Authorizer経由）
    const userId = event.requestContext.authorizer.claims.sub;
    if (!userId) {
      return createResponse(401, { error: 'Unauthorized' }, headers);
    }

    const { httpMethod, resource, pathParameters } = event;

    // ルーティング
    if (httpMethod === 'GET' && resource === '/records') {
      return await getRecords(userId, headers);
    }

    if (httpMethod === 'POST' && resource === '/records') {
      return await saveRecord(userId, JSON.parse(event.body), headers);
    }

    if (httpMethod === 'PUT' && resource === '/records/{id}') {
      const body = JSON.parse(event.body);
      return await updateRecord(userId, pathParameters.id, body, headers);
    }

    if (httpMethod === 'DELETE' && resource === '/records/{id}') {
      return await deleteRecord(userId, pathParameters.id, headers);
    }

    // マスターキー関連のルーティング
    if (httpMethod === 'GET' && resource === '/masterkey') {
      return await getMasterKey(userId, headers);
    }

    if (httpMethod === 'POST' && resource === '/masterkey') {
      return await saveMasterKey(userId, JSON.parse(event.body), headers);
    }

    if (httpMethod === 'PUT' && resource === '/masterkey') {
      return await updateMasterKey(userId, JSON.parse(event.body), headers);
    }

    return createResponse(404, { error: 'Not found' }, headers);
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: error.message }, headers);
  }
};

/**
 * 記録一覧を取得
 */
async function getRecords(userId, headers) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false, // 降順（新しい順）
    Limit: 1000
  };

  try {
    const result = await docClient.send(new QueryCommand(params));

    return createResponse(200, {
      items: result.Items || [],
      count: result.Items?.length || 0
    }, headers);
  } catch (error) {
    console.error('GetRecords error:', error);
    return createResponse(500, {
      error: 'Failed to retrieve records',
      details: error.message
    }, headers);
  }
}

/**
 * 記録を保存
 */
async function saveRecord(userId, body, headers) {
  const { data, encrypted, timestamp, recordId } = body;

  if (!data || typeof encrypted !== 'boolean') {
    return createResponse(400, { error: 'Invalid request body' }, headers);
  }

  // recordIdが指定されていない場合は生成
  const id = recordId || generateId();
  const now = Date.now();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId,
      recordId: id,
      data,
      encrypted,
      timestamp: timestamp || now,
      createdAt: now,
      updatedAt: now
    }
  };

  try {
    await docClient.send(new PutCommand(params));

    return createResponse(201, {
      success: true,
      recordId: id,
      timestamp: params.Item.timestamp
    }, headers);
  } catch (error) {
    console.error('SaveRecord error:', error);
    return createResponse(500, {
      error: 'Failed to save record',
      details: error.message
    }, headers);
  }
}

/**
 * 記録を更新
 */
async function updateRecord(userId, recordId, body, headers) {
  const { data, encrypted, timestamp } = body;

  if (!data || typeof encrypted !== 'boolean') {
    return createResponse(400, {
      error: 'Invalid request body. Required: data, encrypted'
    }, headers);
  }

  const now = Date.now();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId,
      recordId,
      data,
      encrypted,
      timestamp: timestamp || now,
      updatedAt: now
    }
  };

  try {
    await docClient.send(new PutCommand(params));

    return createResponse(200, {
      success: true,
      recordId,
      updatedAt: now
    }, headers);
  } catch (error) {
    console.error('UpdateRecord error:', error);
    return createResponse(500, {
      error: 'Failed to update record',
      details: error.message
    }, headers);
  }
}

/**
 * 記録を削除
 */
async function deleteRecord(userId, recordId, headers) {
  if (!recordId) {
    return createResponse(400, { error: 'Invalid record ID' }, headers);
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      userId,
      recordId
    }
  };

  try {
    await docClient.send(new DeleteCommand(params));

    return createResponse(200, {
      success: true,
      recordId,
      deletedAt: Date.now()
    }, headers);
  } catch (error) {
    console.error('DeleteRecord error:', error);
    return createResponse(500, {
      error: 'Failed to delete record',
      details: error.message
    }, headers);
  }
}

/**
 * レスポンスを作成
 */
function createResponse(statusCode, body, headers) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

/**
 * ユニークIDを生成
 * UUID v4形式（簡易版）
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * マスターキーを取得
 */
async function getMasterKey(userId, headers) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :userId AND recordId = :recordId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':recordId': 'MASTER_KEY'
    },
    Limit: 1
  };

  try {
    const result = await docClient.send(new QueryCommand(params));

    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      return createResponse(200, {
        wrappedKey: item.wrappedKey,
        iv: item.iv
      }, headers);
    }

    return createResponse(404, {
      error: 'Master key not found'
    }, headers);
  } catch (error) {
    console.error('GetMasterKey error:', error);
    return createResponse(500, {
      error: 'Failed to retrieve master key',
      details: error.message
    }, headers);
  }
}

/**
 * マスターキーを保存
 */
async function saveMasterKey(userId, body, headers) {
  const { wrappedKey, iv } = body;

  if (!wrappedKey || !iv) {
    return createResponse(400, {
      error: 'Invalid request body. Required: wrappedKey, iv'
    }, headers);
  }

  const now = Date.now();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId,
      recordId: 'MASTER_KEY',
      wrappedKey,
      iv,
      createdAt: now,
      updatedAt: now
    }
  };

  try {
    await docClient.send(new PutCommand(params));

    return createResponse(201, {
      success: true,
      message: 'Master key saved successfully'
    }, headers);
  } catch (error) {
    console.error('SaveMasterKey error:', error);
    return createResponse(500, {
      error: 'Failed to save master key',
      details: error.message
    }, headers);
  }
}

/**
 * マスターキーを更新
 */
async function updateMasterKey(userId, body, headers) {
  const { wrappedKey, iv } = body;

  if (!wrappedKey || !iv) {
    return createResponse(400, {
      error: 'Invalid request body. Required: wrappedKey, iv'
    }, headers);
  }

  const now = Date.now();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId,
      recordId: 'MASTER_KEY',
      wrappedKey,
      iv,
      updatedAt: now
    }
  };

  try {
    await docClient.send(new PutCommand(params));

    return createResponse(200, {
      success: true,
      message: 'Master key updated successfully'
    }, headers);
  } catch (error) {
    console.error('UpdateMasterKey error:', error);
    return createResponse(500, {
      error: 'Failed to update master key',
      details: error.message
    }, headers);
  }
}
