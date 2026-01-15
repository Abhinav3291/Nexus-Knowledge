from typing import TypedDict, List
import os
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.rag_engine import RAGEngine

class AgentState(TypedDict):
    question: str
    documents: List[str]
    answer: str
    run_web_search: bool

rag = RAGEngine()

# Using Google Gemini 2.0 for cloud deployment
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)

def invoke_llm(llm, prompt: str) -> str:
    """Invoke LLM with Gemini 2.0"""
    response = llm.invoke(prompt)
    return response.content

def retrieve_node(state: AgentState):
    docs = rag.get_retriever().invoke(state["question"])
    return {"documents": [d.page_content for d in docs], "run_web_search": False}

def grade_documents_node(state: AgentState):
    documents = state["documents"]
    filtered_docs = []
    search = False
    
    for doc in documents:
        prompt = f"Is this document relevant to: {state['question']}? Answer only 'yes' or 'no'.\nDoc: {doc}"
        try:
            res = invoke_llm(llm, prompt)
            if "yes" in res.lower():
                filtered_docs.append(doc)
        except Exception as e:
            print(f"Error grading document: {e}")
            filtered_docs.append(doc)
    
    if not filtered_docs:
        search = True
        
    return {"documents": filtered_docs}


def generative_node(state: AgentState):
    if state.get("answer"):
        return state

    context = "\n\n".join(state["documents"])
    prompt = f"Based on the following context, answer the question.\n\nContext: {context}\n\nQuestion: {state['question']}\n\nAnswer:"
    try:
        response_content = invoke_llm(llm, prompt)
        return {"answer": response_content}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}

def decide_to_generate(state: AgentState):
    return "generate"

workflow = StateGraph(AgentState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("grade", grade_documents_node)
workflow.add_node("generate", generative_node)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "grade")

workflow.add_conditional_edges(
    "grade",
    decide_to_generate,
    {
        "generate": "generate"
    }
)

workflow.add_edge("generate", END)

agent_graph = workflow.compile()