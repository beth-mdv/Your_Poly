# -*- coding: utf-8 -*-
# ==============================================================================
# 1. Завантаження бібліотек
# ==============================================================================
print("1. Installing stable library versions...")

!pip install transformers==4.56.2 accelerate bitsandbytes torch psutil fastapi uvicorn pyngrok nest_asyncio -q

print(" All libraries installed successfully")

import json
import re
import torch
import time
import os
import gc
import random
import psutil
import nest_asyncio
import uvicorn
from threading import Thread
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyngrok import ngrok
from transformers import AutoTokenizer, AutoModelForCausalLM, set_seed
from typing import List, Dict, Any, Tuple

# ==============================================================================
# 2. FASTAPI SETUP FOR REACT
# ==============================================================================
app = FastAPI(title="Poli Campus Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


NGROK_AUTH_TOKEN = "35smHRNeZie92xlOZhaIj8ltXyx_69uJpAy89uCP84ZcaasZo"
PORT = 8001  
ngrok.set_auth_token(NGROK_AUTH_TOKEN)

set_seed(42)

# ---------------- Cloud-Optimized Settings ----------------
MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
DB_FILE = "poly_data.json"
MAX_HISTORY_CHARS = 1500


model = None
tokenizer = None
ROOM_DATABASE = {}
USER_SESSIONS = {}

# ==============================================================================
# 3. YOUR PERFECTLY WORKING CODE (UNCHANGED)
# ==============================================================================

# ---------------- Memory-Optimized Model Loading ----------------
def load_model_safely():
    """Safe model loading with memory optimization and warning suppression"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🚀 Using device: {device.upper()}")

    if device == "cpu":
        print("❌ No GPU detected! This will be very slow.")
        return None, None

    try:
       
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"📊 Available GPU memory: {gpu_memory:.1f}GB")

        if gpu_memory < 12:
            print("⚠️ Warning: Low GPU memory. Model might not load properly.")
    except:
        print("⚠️ Could not detect GPU memory")

    try:
       
        print("🔄 Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_NAME,
            trust_remote_code=True,
            padding_side="left"
        )

        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

      
        print("🔄 Loading model (this may take a few minutes)...")

      
        try:
           
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True,
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                low_cpu_mem_usage=True,
                attn_implementation="eager"
            )
            print("✅ Model loaded with 4-bit quantization")
        except Exception as e:
            print(f"⚠️ 4-bit loading failed: {e}")
            print("🔄 Trying without 4-bit quantization...")
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True,
                attn_implementation="eager"
            )
            print("✅ Model loaded without quantization")

        return model, tokenizer

    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        return None, None

# ---------------- Database Loading ----------------
def load_room_database(filename: str) -> Dict[str, Any]:
    """Load database with error handling"""
    try:
        if not os.path.exists(filename):
            print(f"❌ Database file '{filename}' not found. Please upload it to Colab files.")
            return {}

        with open(filename, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
            lookup_db = {}
            for item in data:
                building_str = str(item.get('building', '')).strip()
                number_str = str(item.get('number', '')).strip()

                if not building_str or not number_str:
                    continue

                key = f"{building_str}_{number_str}"
                item['building'] = building_str
                item['number'] = number_str
                lookup_db[key] = item
            return lookup_db
    except Exception as e:
        print(f"❌ Database error: {e}")
        return {}

# ---------------- Generation Function ----------------
def generate_phi3_response_optimized(prompt: str, max_tokens: int = 120, temperature: float = 0.7) -> str:
    """Optimized generation with DynamicCache fix"""
    if model is None or tokenizer is None:
        return "System temporarily unavailable"

    try:
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=2048,
            padding=True
        )
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                do_sample=temperature > 0,
                top_p=0.9,
                pad_token_id=tokenizer.eos_token_id,
                num_return_sequences=1,
                repetition_penalty=1.1,
                use_cache=False
            )

        response = tokenizer.decode(outputs[0], skip_special_tokens=False)

       
        if "<|assistant|>" in response:
            response = response.split("<|assistant|>")[-1]
        if "<|end|>" in response:
            response = response.split("<|end|>")[0]

      
        response = response.replace(tokenizer.pad_token, "").strip()

       
        del inputs, outputs
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return response

    except torch.cuda.OutOfMemoryError:
        print("⚠️ GPU Out of Memory - clearing cache")
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        return "I'm having temporary memory issues. Please try again."
    except Exception as e:
        print(f"❌ Generation error: {e}")
        return "Sorry, I encountered an error. Please try again."

# ---------------- Enhanced Phi-3 Chat Template ----------------
def format_phi3_chat_prompt(system_prompt: str, user_message: str, history: str = "") -> str:
    """Format prompt for Phi-3 according to chat template"""
    if history:
        conversation_context = f"Previous conversation:\n{history}\n"
    else:
        conversation_context = ""

    prompt = f"<|system|>\n{system_prompt}<|end|>\n"
    prompt += f"<|user|>\n{conversation_context}{user_message}<|end|>\n"
    prompt += "<|assistant|>\n"

    return prompt

# ---------------- Smart Context Detection ----------------
def is_small_talk_or_nonsense(user_input: str) -> bool:
    """Check if request is small talk or nonsense"""
    user_lower = user_input.lower().strip()

   
    if any(word in user_lower for word in ['room', 'building', 'where', 'find', 'kabinet', 'corpus', 'build']):
        return False
    
    if re.search(r'\d+', user_lower):
        return False

    small_talk_patterns = [
        'hi', 'hello', 'hey', 'how are you', 'what\'s up', 'how do you do',
        'what your name', 'your name', 'who are you', 'thanks', 'thank you',
        'good morning', 'good afternoon', 'good evening', 'cool', 'nice'
    ]
    nonsense_patterns = ['test', 'abc', '123', '???', '...']

    if any(pattern in user_lower for pattern in small_talk_patterns):
        return True

    if (len(user_input) < 3 or
        any(pattern in user_lower for pattern in nonsense_patterns) or
        len(set(user_lower)) < 3):
        return True

    return False

def generate_smart_response(user_input: str, history: str = "") -> str:
    """Generate intelligent response for small talk"""
    if is_small_talk_or_nonsense(user_input):

        
        if any(pattern in user_input.lower() for pattern in ['your name', 'who are you']):
            return "I'm Poli, your AI assistant for Lviv Polytechnic! I can help you navigate Building 1. Just ask me about any room."

        system_prompt = """You are Poli, a friendly and helpful AI assistant for Lviv Polytechnic University.
        User is chatting with you.
        Be polite, concise (1-2 sentences), and encourage them to ask about navigation.
        Do NOT invent room numbers.
        Current context: Chatting about general things."""

        prompt = format_phi3_chat_prompt(system_prompt, user_input, history)

        
        response = generate_phi3_response_optimized(prompt, max_tokens=100, temperature=0.8)

        return response

    return None

def generate_variational_response(response_type: str, room: str = "", building: str = "") -> str:
    """Generate variational responses for typical situations"""
    response_templates = {
        "awaiting_building": [
            "Sure! I see you're looking for Room {room}. Which building should I check?",
            "Got it — Room {room}. Could you tell me which building it's in?",
            "Room {room} noted! Just need the building number to find it for you.",
        ],
        "room_not_found": [
            "I couldn't find Room {room} in Building {building}. Could you double-check the numbers?",
            "Hmm, Room {room} in Building {building} doesn't seem to exist in my database.",
            "No match for Room {room}, Building {building}. Maybe check the room and building numbers?",
        ],
        "clarify_request": [
            "I'm not quite sure what you're looking for. Could you specify a room and building?",
            "To help you navigate, I'll need a room number and building.",
            "Which room and building are you trying to find?",
        ],
        "building_not_available": [
            "Currently, I can only help with Building 1 (floors 1 and 2). Building {building} is not available in our system.",
            "I'm sorry, but right now I only have information for Building 1 with floors 1 and 2. Building {building} is not supported.",
        ]
    }

    templates = response_templates.get(response_type, ["Please provide more details."])
    return random.choice(templates).format(room=room, building=building)

# ---------------- Logic Functions (IMPROVED) ----------------
def find_room_by_name(query: str) -> Dict[str, Any] | None:
    """Improved room search by name"""
    query_clean = re.sub(r'[^\w\s]', '', query.lower().strip())

    exact_matches = []
    partial_matches = []

    for _, details in ROOM_DATABASE.items():
        names = [n.lower() for n in details.get('names_en', [])]

        for name in names:
            name_clean = re.sub(r'[^\w\s]', '', name.lower())

            if query_clean == name_clean:
                exact_matches.append(details)
            elif len(query_clean) > 3 and (query_clean in name_clean or name_clean in query_clean):
                partial_matches.append(details)

    if exact_matches:
        return random.choice(exact_matches)
    elif partial_matches:
        return random.choice(partial_matches)

    return None

def extract_info_from_query_by_ai(query: str, history: str) -> Dict[str, str]:
    """Improved query parsing with SAFEGUARD against hallucinations"""

    
    simple_room_match = re.search(r'\b(\d{3,4}[a-zA-Z]?)\b', query)
    simple_build_match = re.search(r'(?:building|bld|корпус)\s*(\d+)', query, re.IGNORECASE)

    regex_room = simple_room_match.group(1) if simple_room_match else ""
    regex_building = simple_build_match.group(1) if simple_build_match else ""

    
    system_prompt = """Extract ONLY numeric room and building numbers from the query.
    Return JSON format: {"room": "...", "building": "..."}.
    """
    prompt = format_phi3_chat_prompt(system_prompt, query, history)

    response = generate_phi3_response_optimized(prompt, max_tokens=60, temperature=0.1)

    ai_room = ""
    ai_building = ""

    try:
        json_match = re.search(r'\{[^{}]*\}', response)
        if json_match:
            data = json.loads(json_match.group())
            ai_room = str(data.get("room", "")).strip()
            ai_building = str(data.get("building", "")).strip()
    except:
        pass

    # -----------------------------------------------------------
    # ЗАПОБІЖНИК ВІД ГАЛЮЦИНАЦІЙ (HALLUCINATION SAFEGUARD)
    
    # -----------------------------------------------------------

    final_room = ""
    final_building = ""

    
    if ai_room and (ai_room in query):
        final_room = ai_room
    else:
        
        final_room = regex_room

    if ai_building and (ai_building in query):
        final_building = ai_building
    else:
        final_building = regex_building

    return {"room": final_room, "building": final_building}

def find_room(room: str, building: str = None) -> Dict[str, Any] | None:
    """Search for room in database"""
    room_str = str(room).strip()
    building_str = str(building).strip() if building else None

    if room_str and building_str:
        key = f"{building_str}_{room_str}"
        return ROOM_DATABASE.get(key, None)

    if room_str and not building_str:
        matches = []
        for item in ROOM_DATABASE.values():
            if item.get("number") == room_str:
                matches.append(item)
        if matches:
            return matches[0]

    return None

# ---------------- NAVIGATION RESPONSE (UPDATED) ----------------
def generate_navigation_response(room_data: Dict[str, Any]) -> str:
    """
    Generate detailed response including street, floor, and wing.
    Ensures all fields from poly_data.json are utilized.
    """
    if not room_data:
        return "I couldn't find that room. Could you check the room and building numbers?"

   
    number = room_data.get('number', 'Unknown')

   
    names = room_data.get('names_en', [])
    name_str = names[0] if names else f"Room {number}"

    building = room_data.get('building', '1')
    floor = room_data.get('floor', 'ground')
    wing = room_data.get('wing_en', 'main')
    street = room_data.get('street_en', 'University Campus')

  
    response_templates = [
        f"Found it! {name_str} (Room {number}) is located at {street}. It is in Building {building}, on the {floor} floor, {wing} wing. Would you like directions?",
        f"Room {number} is in the {wing} wing on the {floor} floor. The building address is {street}. Should I guide you?",
        f"To find {name_str}, go to {street}, Building {building}. Head to the {floor} floor, {wing} wing. Ready to start navigation?",
        f"That room is at {street} in Building {building}. Look for the {wing} wing on the {floor} floor. Need a map?"
    ]

    return random.choice(response_templates)

# ==============================================================================
# 4. REACT API ENDPOINTS (ВИПРАВЛЕНО ДЛЯ КАРТ - ДОДАНО ПОЛЕ code)
# ==============================================================================

class UserRequest(BaseModel):
    prompt: str
    session_id: str = "default"

def get_user_session(session_id: str):
    """Get or create user session"""
    if session_id not in USER_SESSIONS:
        USER_SESSIONS[session_id] = {
            "history": "",
            "last_details": None,
            "awaiting_building_number": None
        }
    return USER_SESSIONS[session_id]

@app.post("/predict")
async def predict(request: UserRequest):
    """Main endpoint for React frontend - using YOUR PERFECT LOGIC"""
    try:
        session = get_user_session(request.session_id)
        user_input = request.prompt.strip()

        if not user_input:
            return {
                "response": "Please type your message.",
                "data": {
                    "nav_code": None,
                    "navigation_started": False,
                    "navigation_json": None,
                    "room_found": False,
                    "room_data": None
                }
            }

        history = session["history"]
        last_details = session["last_details"]
        awaiting_building_number = session["awaiting_building_number"]

        
        if last_details:
            if user_input.lower() in ["yes", "sure", "please", "guide", "y", "ok"]:
               
                nav_code = last_details.get('code', 0)

                session["last_details"] = None
                session["history"] = ""
                return {
                    "response": "Navigation started! Have a wonderful trip! 🗺️",
                    "data": {
                        "nav_code": nav_code, 
                        "code": nav_code, 
                        "navigation_started": True,
                        "navigation_json": None,  
                        "room_found": True,
                        "room_data": last_details
                    }
                }
            elif user_input.lower() in ["no", "skip", "not now"]:
                session["last_details"] = None
                session["history"] = ""
                return {
                    "response": "No problem! Let me know if you need anything else.",
                    "data": {
                        "nav_code": None,
                        "code": None,
                        "navigation_started": False,
                        "navigation_json": None,
                        "room_found": False,
                        "room_data": None
                    }
                }

        
        history += f"\nUser: {user_input}"
        if len(history) > MAX_HISTORY_CHARS:
            history = '\n'.join(history.split('\n')[-8:])

        response_text = ""
        navigation_data = {
            "nav_code": None,
            "code": None,
            "navigation_started": False,
            "navigation_json": None,
            "room_found": False,
            "room_data": None
        }

       
        smart_response = generate_smart_response(user_input, history)
        if smart_response:
            response_text = smart_response
            if "building" not in user_input.lower() and "room" not in user_input.lower():
                session["history"] = f"User: {user_input}\nPoli: {smart_response}"
            else:
                session["history"] = history + f"\nPoli: {smart_response}"
        else:
            
            details = find_room_by_name(user_input)
            if details:
                response_text = generate_navigation_response(details)
                session["last_details"] = details
                session["history"] = history + f"\nPoli: {response_text}"
                navigation_data["room_found"] = True
                navigation_data["room_data"] = details
              
                nav_code_value = details.get('code', 0)
                navigation_data["nav_code"] = nav_code_value
                navigation_data["code"] = nav_code_value  
            else:
                
                if awaiting_building_number:
                    building_match = re.search(r"\d+", user_input)
                    if building_match:
                        building = building_match.group(0)
                        room = awaiting_building_number
                        session["awaiting_building_number"] = None
                        if building != "1":
                            response_text = generate_variational_response("building_not_available", building=building)
                        else:
                            details = find_room(room, building)
                            if details:
                                response_text = generate_navigation_response(details)
                                session["last_details"] = details
                                navigation_data["room_found"] = True
                                navigation_data["room_data"] = details
                               
                                nav_code_value = details.get('code', 0)
                                navigation_data["nav_code"] = nav_code_value
                                navigation_data["code"] = nav_code_value  
                            else:
                                response_text = generate_variational_response("room_not_found", room=room, building=building)
                        session["history"] = history + f"\nPoli: {response_text}"
                    else:
                        session["awaiting_building_number"] = None
                else:
                   
                    info = extract_info_from_query_by_ai(user_input, history)
                    room = info.get("room", "")
                    building = info.get("building", "")

                    if "building 3" in user_input.lower():
                        if not building: building = "3"

                  
                    if room and building:
                        if building != "1":
                            response_text = generate_variational_response("building_not_available", building=building)
                        else:
                            details = find_room(room, building)
                            if details:
                                response_text = generate_navigation_response(details)
                                session["last_details"] = details
                                navigation_data["room_found"] = True
                                navigation_data["room_data"] = details
                                
                                nav_code_value = details.get('code', 0)
                                navigation_data["nav_code"] = nav_code_value
                                navigation_data["code"] = nav_code_value 
                            else:
                                response_text = generate_variational_response("room_not_found", room=room, building=building)
                    elif room and not building:
                        details = find_room(room, "1")
                        if details:
                            response_text = generate_variational_response("awaiting_building", room=room)
                            session["awaiting_building_number"] = room
                        else:
                            response_text = generate_variational_response("awaiting_building", room=room)
                            session["awaiting_building_number"] = room
                    else:
                        response_text = generate_variational_response("clarify_request")

                    session["history"] = history + f"\nPoli: {response_text}"

        return {
            "response": response_text,
            "data": navigation_data
        }

    except Exception as e:
        print(f"❌ API Error: {e}")
        return {
            "response": "Hello! I'm Poli, ready to help you find rooms.",
            "data": {
                "nav_code": None,
                "code": None,
                "navigation_started": False,
                "navigation_json": None,
                "room_found": False,
                "room_data": None
            }
        }

@app.get("/")
async def health_check():
    return {
        "status": "active",
        "model_loaded": model is not None,
        "rooms_loaded": len(ROOM_DATABASE),
        "active_sessions": len(USER_SESSIONS)
    }

@app.get("/api/health")
async def api_health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "database_loaded": len(ROOM_DATABASE) > 0,
        "gpu_available": torch.cuda.is_available(),
        "timestamp": time.time()
    }

# ==============================================================================
# 5. INITIALIZATION AND SERVER START
# ==============================================================================
def initialize_service():
    """Initialize the AI service"""
    print("🔍 Initializing Poli Navigation Service...")

    global model, tokenizer, ROOM_DATABASE

    
    model, tokenizer = load_model_safely()

    ROOM_DATABASE = load_room_database(DB_FILE)
    print(f"✅ Database loaded: {len(ROOM_DATABASE)} rooms")

   
    print(f"📊 PyTorch version: {torch.__version__}")
    print(f"📊 CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"📊 GPU: {torch.cuda.get_device_name(0)}")

    print("✅ Service initialization complete!")

def start_server():
    """Start the FastAPI server"""
    nest_asyncio.apply()

    try:
        ngrok.kill()
        public_url = ngrok.connect(PORT).public_url

        print("\n" + "="*60)
        print("🚀 POLI CAMPUS ASSISTANT - READY FOR REACT")
        print("="*60)
        print(f"🔗 URL for React: {public_url}")
        print(f"🏫 Rooms in database: {len(ROOM_DATABASE)}")
        print("✅ Your perfect logic preserved")
        print("✅ nav_code + code fields for maps")
        print("✅ Fixed port 8001")
        print("="*60)
        print("📝 API Endpoints:")
        print("   - POST /predict - Main chat endpoint")
        print("   - GET  /api/health - Health check")
        print("   - GET  / - Service info")
        print("="*60)

        uvicorn.run(app, host="0.0.0.0", port=PORT, access_log=False)

    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")


if __name__ == "__main__":
    initialize_service()

    if model and ROOM_DATABASE:
       
        server_thread = Thread(target=start_server, daemon=True)
        server_thread.start()

        print("\n🎯 Server is starting...")
        print("💡 You can now connect your React app to the URL above")
        print("🔧 Don't forget to update API_BASE_URL in React to the new URL!")

        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")