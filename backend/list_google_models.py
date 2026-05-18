
  # backend/list_google_models.py
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("GOOGLE_API_KEY not found in .env file.")
else:
      genai.configure(api_key=GOOGLE_API_KEY)
      print("Available Google Generative Models for your API Key:")
      print("-" * 30)
      try:
          for m in genai.list_models():
              # We are interested in models that support 'generateContent' (for text generation)
              # and 'embedContent' (for embeddings)
              if 'generateContent' in m.supported_generation_methods:
                  print(f"Model Name: {m.name}")
                  print(f"  Display Name: {m.display_name}")
                  print(f"  Description: {m.description[:100]}...") # First 100 chars
                  print(f"  Supported Generation Methods: {m.supported_generation_methods}")
                  print("-" * 20)
          
          print("\nAvailable Google Embedding Models for your API Key:")
          print("-" * 30)
          for m in genai.list_models():
              if 'embedContent' in m.supported_generation_methods: # 'embedContent' is the method for embeddings
                  print(f"Model Name: {m.name}")
                  print(f"  Display Name: {m.display_name}")
                  print(f"  Description: {m.description[:100]}...") # First 100 chars
                  print(f"  Supported Generation Methods: {m.supported_generation_methods}")
                  print("-" * 20)

      except Exception as e:
          print(f"Error listing models: {e}")
          print("Please ensure your API key is correct and the 'Generative Language API' is enabled if using Google Cloud.")
