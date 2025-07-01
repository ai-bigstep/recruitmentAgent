import uvicorn
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.routing import Route, Mount
from mcp.server.sse import SseServerTransport
from tools.godrej_properties_tools import mcp as godrej_mcp
from tools.tata_motors_tools import mcp as tata_mcp
from dotenv import load_dotenv
import os
sse = SseServerTransport("/messages/")


load_dotenv()  # Add this to load .env variables

company = os.getenv("COMPANY", "godrej")  # Default to godrej if not set

mcp = godrej_mcp if company == "godrej" else tata_mcp


async def handle_sse(request: Request) -> None:
    _server = mcp._mcp_server
    async with sse.connect_sse(
        request.scope,
        request.receive,
        request._send,
    ) as (reader, writer):
        await _server.run(reader, writer, _server.create_initialization_options())

app = Starlette(
    debug=True,
    routes=[
        Route("/sse", endpoint=handle_sse),
        Mount("/messages/", app=sse.handle_post_message),
    ],
)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8001)