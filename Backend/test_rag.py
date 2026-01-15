import time
from app.db.session import get_vector_store
from dotenv import load_dotenv

load_dotenv()

def test_retrieval():
    vector_db = get_vector_store()
    query = "Technical Skills "
    
 
    for attempt in range(3):
        try:
            print(f"Attempt {attempt + 1}: Testing query...")
            docs = vector_db.similarity_search(query, k=2)
            
            if docs:
                print("\n SUCCESS!")
                print(f"Found: {docs[0]}")
                return
        except Exception as e:
            if "429" in str(e):
                print("⚠️ Rate limit hit. Waiting 20 seconds...")
                time.sleep(20) 
            else:
                raise e
    print("\n Could not retrieve data after 3 attempts.")

if __name__ == "__main__":
    test_retrieval()