import os
import json
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from app.agents.graph import agent_graph
from app.core.rag_engine import RAGEngine
from app.db.database import init_db, get_db_session
from app.db.models import Conversation, Message, Document
import tempfile

app = FastAPI()

rag_engine = RAGEngine()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    try:
        init_db()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Make sure PostgreSQL is running and the database exists.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_FOLDER = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_FOLDER, exist_ok=True)

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files are supported"}
    
    try:
        file_path = os.path.join(DATA_FOLDER, file.filename)
        
        content = await file.read() 

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        result = rag_engine.process_pdf(file_path)
        
        return {
            "status": "success", 
            "message": f"PDF '{file.filename}' saved and processed successfully",
            "file_path": file_path,
            "result": result
        }
    
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@app.get("/files")
async def list_files():
    """List all uploaded PDF files"""
    try:
        files = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.pdf')]
        return {"status": "success", "files": files, "count": len(files)}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    """Delete an uploaded PDF file"""
    try:
        file_path = os.path.join(DATA_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"status": "success", "message": f"File '{filename}' deleted"}
        return {"status": "error", "message": "File not found"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

# ============== CONVERSATION API ENDPOINTS ==============

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationUpdate(BaseModel):
    title: str

class MessageCreate(BaseModel):
    role: str
    content: str

@app.get("/conversations")
async def list_conversations():
    """List all conversations"""
    db = get_db_session()
    try:
        conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
        return {"status": "success", "conversations": [c.to_dict() for c in conversations]}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@app.post("/conversations")
async def create_conversation(data: ConversationCreate):
    """Create a new conversation"""
    db = get_db_session()
    try:
        conversation = Conversation(title=data.title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return {"status": "success", "conversation": conversation.to_dict()}
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a conversation with its messages"""
    db = get_db_session()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {
            "status": "success",
            "conversation": conversation.to_dict(),
            "messages": [m.to_dict() for m in conversation.messages]
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@app.put("/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, data: ConversationUpdate):
    """Update conversation title"""
    db = get_db_session()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conversation.title = data.title
        db.commit()
        return {"status": "success", "conversation": conversation.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and all its messages"""
    db = get_db_session()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        db.delete(conversation)
        db.commit()
        return {"status": "success", "message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@app.post("/conversations/{conversation_id}/messages")
async def add_message(conversation_id: str, data: MessageCreate):
    """Add a message to a conversation"""
    db = get_db_session()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        message = Message(
            conversation_id=conversation_id,
            role=data.role,
            content=data.content
        )
        db.add(message)
        
        # Update conversation title from first user message
        if data.role == "user" and len(conversation.messages) == 0:
            conversation.title = data.content[:50] + ("..." if len(data.content) > 50 else "")
        
        db.commit()
        db.refresh(message)
        return {"status": "success", "message": message.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

# ============== WEBSOCKET WITH CONVERSATION SUPPORT ==============

@app.websocket("/ws/{conversation_id}")
async def chat_socket(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    connection_closed = False
    
    try:
        while True:
            query = await websocket.receive_text()
            inputs = {"question": query}
            
            # Save user message to database
            db = get_db_session()
            try:
                conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if conversation:
                    user_msg = Message(conversation_id=conversation_id, role="user", content=query)
                    db.add(user_msg)
                    # Update title from first message
                    if len(conversation.messages) == 0:
                        conversation.title = query[:50] + ("..." if len(query) > 50 else "")
                    db.commit()
            except Exception as db_error:
                print(f"Error saving user message: {db_error}")
            finally:
                db.close()
            
            assistant_response = ""
            
            try:
                async for event in agent_graph.astream_events(inputs, version="v1"):
                    kind = event["event"]
                    
                    if kind == "on_chain_start":
                        await websocket.send_json({"type": "status", "content": "Thinking..."})
                    
                    elif kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            assistant_response += content
                            await websocket.send_json({"type": "chunk", "content": content})

                await websocket.send_json({"type": "end", "content": ""})
                
                # Save assistant response to database
                if assistant_response:
                    db = get_db_session()
                    try:
                        assistant_msg = Message(conversation_id=conversation_id, role="assistant", content=assistant_response)
                        db.add(assistant_msg)
                        db.commit()
                    except Exception as db_error:
                        print(f"Error saving assistant message: {db_error}")
                    finally:
                        db.close()
                        
            except Exception as agent_error:
                error_msg = str(agent_error)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    await websocket.send_json({
                        "type": "chunk", 
                        "content": "⚠️ Rate limit reached. Please wait about 60 seconds before asking another question."
                    })
                else:
                    await websocket.send_json({
                        "type": "chunk",
                        "content": f"Error processing request: {error_msg}"
                    })
                await websocket.send_json({"type": "end", "content": ""})

    except WebSocketDisconnect:
        connection_closed = True
        print("WebSocket disconnected by client")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        if not connection_closed:
            try:
                await websocket.close()
            except:
                pass

# Legacy WebSocket endpoint (without conversation)
@app.websocket("/ws")
async def chat_socket_legacy(websocket: WebSocket):
    await websocket.accept()
    connection_closed = False
    
    try:
        while True:
            query = await websocket.receive_text()
            inputs = {"question": query}
            
            try:
                async for event in agent_graph.astream_events(inputs, version="v1"):
                    kind = event["event"]
                    
                    if kind == "on_chain_start":
                        await websocket.send_json({"type": "status", "content": "Thinking..."})
                    
                    elif kind == "on_chat_model_stream":
                        content = event["data"]["chunk"].content
                        if content:
                            await websocket.send_json({"type": "chunk", "content": content})

                await websocket.send_json({"type": "end", "content": ""})
            except Exception as agent_error:
                error_msg = str(agent_error)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    await websocket.send_json({
                        "type": "chunk", 
                        "content": "⚠️ Rate limit reached. Please wait about 60 seconds before asking another question."
                    })
                else:
                    await websocket.send_json({
                        "type": "chunk",
                        "content": f"Error processing request: {error_msg}"
                    })
                await websocket.send_json({"type": "end", "content": ""})

    except WebSocketDisconnect:
        connection_closed = True
        print("WebSocket disconnected by client")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        if not connection_closed:
            try:
                await websocket.close()
            except:
                pass