import os
from sqlalchemy.orm import Session
from models.carbon_record import CarbonRecord
from models.user import User

def generate_recommendations(user: User, db: Session) -> list:
    # 1. Fetch user's recent emission history (e.g. past 30 days)
    records = db.query(CarbonRecord).filter(CarbonRecord.user_id == user.id).all()
    
    category_totals = {
        "transport": 0.0,
        "energy": 0.0,
        "food": 0.0,
        "shopping": 0.0
    }
    
    for r in records:
        category_totals[r.category] = category_totals.get(r.category, 0.0) + r.co2_output
        
    total_emissions = sum(category_totals.values())
    highest_category = max(category_totals, key=category_totals.get) if total_emissions > 0 else None

    # Try calling Gemini if API key is present
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            You are a sustainability and carbon reduction consultant. 
            User preferences: Dietary preference = {user.dietary_preference}, Travel preference = {user.travel_preference}.
            User's emissions by category over the past month:
            - Transport: {category_totals['transport']} kg CO2e
            - Energy: {category_totals['energy']} kg CO2e
            - Food: {category_totals['food']} kg CO2e
            - Shopping: {category_totals['shopping']} kg CO2e
            Total monthly emissions: {total_emissions} kg CO2e.
            
            Provide 3 to 4 specific, actionable tips to reduce their carbon footprint.
            Format the response as a JSON list containing dictionaries with:
            "title" (string, short action title), 
            "category" (string: transport, energy, food, shopping), 
            "description" (string, explanation of how to do it and impact), 
            "estimated_savings" (float, estimated kg CO2 reduced per month), 
            "difficulty" (string: Easy, Medium, Hard).
            Do not include markdown tags like ```json or anything else. Return ONLY the raw valid JSON list.
            """
            response = model.generate_content(prompt)
            import json
            # Sanitize response text
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            recommendations = json.loads(text)
            return recommendations
        except Exception as e:
            # Fall back to heuristic rule engine on error
            pass

    # Heuristic Rule Engine
    recommendations = []
    
    # Category: Food Recommendations
    if user.dietary_preference == "heavy_meat" or category_totals["food"] > total_emissions * 0.3:
        recommendations.append({
            "title": "Adopt 'Meatless Mondays'",
            "category": "food",
            "description": "Swapping red meat for plant-based meals once a week can reduce your food emissions significantly. Beef emits 27.0 kg CO2e per serving, while a vegan meal emits only 0.7 kg CO2e.",
            "estimated_savings": 45.0,
            "difficulty": "Easy"
        })
    elif user.dietary_preference == "average":
        recommendations.append({
            "title": "Transition to a Vegetarian or Flexitarian Diet",
            "category": "food",
            "description": "Reducing meat and dairy intake by opting for fish, poultry, or vegetarian options can cut your food footprint in half.",
            "estimated_savings": 30.0,
            "difficulty": "Medium"
        })
        
    # Category: Transport Recommendations
    if user.travel_preference == "car" or category_totals["transport"] > total_emissions * 0.3:
        recommendations.append({
            "title": "Utilize Public Transit or Carpool",
            "category": "transport",
            "description": "Switching some car trips to bus or train travel reduces your transport emissions from 0.18 kg CO2e/mile to 0.04 kg CO2e/mile.",
            "estimated_savings": 60.0,
            "difficulty": "Medium"
        })
        recommendations.append({
            "title": "Replace Short Car Trips with Biking/Walking",
            "category": "transport",
            "description": "Active travel has zero carbon emissions and offers tremendous health benefits. Start by replacing commutes under 2 miles.",
            "estimated_savings": 20.0,
            "difficulty": "Easy"
        })
    
    # Category: Energy Recommendations
    if category_totals["energy"] > 0:
        recommendations.append({
            "title": "Switch to LED Lighting and Smart Thermostats",
            "category": "energy",
            "description": "LED bulbs use 75% less energy. Adding a smart thermostat ensures you are only heating/cooling the house when occupied.",
            "estimated_savings": 25.0,
            "difficulty": "Easy"
        })
        recommendations.append({
            "title": "Opt for Community Solar or Green Power",
            "category": "energy",
            "description": "Check if your utility offers a 'green energy' plan or community solar subscription to source your power from renewables.",
            "estimated_savings": 80.0,
            "difficulty": "Medium"
        })
    else:
        # Default energy recommendation
        recommendations.append({
            "title": "Unplug Phantom Loads",
            "category": "energy",
            "description": "Electronics draw standby power even when turned off. Use smart power strips to shut off supply completely.",
            "estimated_savings": 10.0,
            "difficulty": "Easy"
        })

    # Category: Shopping Recommendations
    if category_totals["shopping"] > total_emissions * 0.2:
        recommendations.append({
            "title": "Practice Mindfulness and Buy Second-Hand",
            "category": "shopping",
            "description": "Before purchasing new clothing (15 kg CO2e/item) or electronics (80 kg CO2e/item), check second-hand stores or wait 48 hours to avoid impulse buys.",
            "estimated_savings": 35.0,
            "difficulty": "Easy"
        })
    else:
        recommendations.append({
            "title": "Repair and Recycle Electronics",
            "category": "shopping",
            "description": "Extend the life of your devices by repairing screens/batteries instead of upgrading immediately. Electronics are extremely carbon-intensive to manufacture.",
            "estimated_savings": 50.0,
            "difficulty": "Hard"
        })

    # Limit to 3-4 recommendations based on highest categories
    if highest_category:
        # Sort so recommendations related to highest category come first
        recommendations.sort(key=lambda x: 0 if x["category"] == highest_category else 1)
        
    return recommendations[:4]
