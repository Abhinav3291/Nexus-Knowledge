import os
import time
import tempfile
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document


try:
    from pdf2image import convert_from_path
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

load_dotenv()

class RAGEngine:
    def __init__(self):
      
        self.embedding = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.persist_directory = "./chroma_db"
        if OCR_AVAILABLE:
            possible_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(os.getenv("USERNAME", "")),
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    break
    
    def extract_text_with_ocr(self, file_path: str) -> list:
        """Extract text from scanned PDF using OCR"""
        if not OCR_AVAILABLE:
            raise ValueError("OCR libraries not installed. Please install pdf2image and pytesseract.")
        
        print("Attempting OCR extraction...")
        documents = []
        
        try:
            
            poppler_path = None
            possible_poppler_paths = [
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "poppler", "poppler-24.08.0", "Library", "bin"),
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "poppler", "Library", "bin"),
                r"C:\Program Files\poppler\Library\bin",
                r"C:\Program Files\poppler-24.08.0\Library\bin",
            ]
            for path in possible_poppler_paths:
                if os.path.exists(path):
                    poppler_path = path
                    break
            
            if poppler_path:
                images = convert_from_path(file_path, dpi=300, poppler_path=poppler_path)
            else:
                images = convert_from_path(file_path, dpi=300)
            
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                
                if text.strip():
                    documents.append(Document(
                        page_content=text,
                        metadata={"page": i + 1, "source": file_path, "extraction": "ocr"}
                    ))
                    print(f"OCR extracted {len(text)} characters from page {i + 1}")
            
            return documents
        except Exception as e:
            print(f"OCR extraction failed: {e}")
            raise ValueError(f"OCR extraction failed: {str(e)}. Make sure Tesseract OCR and Poppler are installed.")
        
    def process_pdf(self, file_path: str):
       
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        
       
        text_documents = [doc for doc in documents if doc.page_content.strip()]
        
       
        if not text_documents:
            print("No text found with regular extraction, attempting OCR...")
            try:
                text_documents = self.extract_text_with_ocr(file_path)
            except Exception as e:
                raise ValueError(f"PDF has no extractable text and OCR failed: {str(e)}")
        
        if not text_documents:
            raise ValueError("Could not extract any text from PDF (tried both regular extraction and OCR)")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=400, 
            chunk_overlap=80,
            length_function=len,
            separators=["\n\n\n", "\n\n", "\n", ". ", " ", ""]
        )
        chunks = text_splitter.split_documents(text_documents)
        
        if not chunks:
            raise ValueError("Could not extract any text chunks from the PDF")
        
        print(f"Starting local ingestion for {len(chunks)} chunks...")
        
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embedding,
            persist_directory=self.persist_directory
        )
        
        print(f"Successfully indexed {len(chunks)} chunks locally.")
        return f"Successfully processed {len(chunks)} text chunks"
    
    def get_retriever(self):
        vector_db = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embedding
        )
        
        return vector_db.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 1, "fetch_k": 5} 
        )