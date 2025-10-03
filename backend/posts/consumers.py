import json
from channels.generic.websocket import AsyncWebsocketConsumer

class FeedConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if self.user and self.user.is_authenticated:
            self.room_group_name = f"user_{self.user.id}"
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
        # Accept connection regardless
        await self.accept()

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Send personalized feed updates
    async def feed_update(self, event):
        await self.send(text_data=json.dumps(event["content"]))