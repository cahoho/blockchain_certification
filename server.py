import asyncio
import websockets
import json
from eth_account.messages import encode_defunct
from eth_account import Account

async def handle_client(websocket):
    print("Python端：Node.js 已连接")

    async for message in websocket:
        data = json.loads(message)
        msg_type = data.get("type")
        msg_content = data.get("message")
        wallet = data.get("wallet")
        signature = data.get("signature")

        if msg_type == "blockchain":
            print(f"收到签名消息: {msg_content}")
            print(f"签名: {signature[:20]}...")
            print(f"钱包地址: {wallet}")

            try:
                # 验证签名
                message = encode_defunct(text=msg_content)
                recovered = Account.recover_message(message, signature=signature)

                if recovered.lower() == wallet.lower():
                    reply = f"签名验证成功！消息来自 {wallet}"
                else:
                    reply = f"签名无效！签名者 {recovered}, 钱包 {wallet}"

            except Exception as e:
                reply = f"验证出错: {str(e)}"

        else:
            reply = f"收到普通消息: {msg_content}"

        await websocket.send(json.dumps({"reply": reply}))


async def main():
    async with websockets.serve(handle_client, "127.0.0.1", 9000):
        print("Python WebSocket 服务器运行在 ws://127.0.0.1:9000")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())