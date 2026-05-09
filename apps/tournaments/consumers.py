import json
from channels.generic.websocket import AsyncWebsocketConsumer


class UserEventsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass  # клієнт нічого не надсилає

    async def tournament_removed(self, event):
        await self.send(text_data=json.dumps({
            "type": "tournament_removed",
            "tournament_id": event["tournament_id"],
        }))
