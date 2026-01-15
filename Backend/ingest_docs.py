import os
from app.core.rag_engine import RAGEngine
from dotenv import load_dotenv

load_dotenv()

def start_ingestion():
    rag = RAGEngine()
    data_path = "./data"

    if not os.path.exists(data_path):
        os.makedirs(data_path)
        print(f"Please place PDfs in the '{data_path}' folder")
        return
    
    for filename in os.listdir(data_path):
        if filename.endswith(".pdf"):
            print(f"Processing: {filename}")
            file_path = os.path.join(data_path , filename)
            rag.process_pdf(file_path)
    print("Success: Vector database created in ./chroma_db")

if __name__  == "__main__":
    start_ingestion()

