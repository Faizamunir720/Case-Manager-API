const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://ummaraummara123_db_user:Ummara7860@cluster0.1epbnef.mongodb.net/Cluster0";

async function testConnection() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db();
    await db.admin().ping();
    console.log('✅ Ping successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Name:', error.name);
  } finally {
    await client.close();
  }
}

testConnection();
