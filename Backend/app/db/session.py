import os
from langchain_chroma import Chroma 
from langchain_huggingface import HuggingFaceEmbeddings # Updated for 2025 standard
from dotenv import load_dotenv

load_dotenv()

def get_db_path():
    """Returns the absolute path to the chroma_db folder."""
  
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    return os.path.join(base_dir, "chroma_db")

def get_vector_store():
    """
    Returns the initialized ChromaDB instance using HuggingFace local embeddings.
    This ensures enterprise-standard data persistence without API rate limits.
    """

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    
    db_path = get_db_path()
    
    vector_db = Chroma(
        persist_directory=db_path,
        embedding_function=embeddings
    )
    
    return vector_db