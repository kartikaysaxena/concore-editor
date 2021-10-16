from pymongo import MongoClient
from pymongo import MongoClient
import time
from bson.objectid import ObjectId
from bson.errors import InvalidId
import os

class WorkFlowModel:
    def __init__(self) -> None:
        self.collection = MongoClient(os.getenv('MongoURL'))[os.getenv('dbName')][os.getenv('tableName')]

    def insert(self, graphml):
        writeTime = time.time()
        id = self.collection.insert_one(
            {'graphml': graphml, 'writeTime': writeTime}).inserted_id
        return {"workflowId": str(id), "writeTime": writeTime}

    def get(self, id):
        try:
            cl = self.collection.find_one({'_id': ObjectId(id)})
            if cl is not None:
                del cl['_id']
            return cl
        except InvalidId:
            return None

    def update(self, id, writeTime, graphml):
        try:
            newWriteTime = time.time()
            rt = self.collection.find_and_modify(
                query={'_id': ObjectId(id), "writeTime": writeTime},
                update={'graphml': graphml, 'writeTime': newWriteTime}
            )
            return newWriteTime if rt is not None else None
        except InvalidId:
            return None