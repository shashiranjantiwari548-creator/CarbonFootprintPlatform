EMISSION_FACTORS = {
    "transport": {
        "petrol_car": 0.18,      # kg CO2e per mile
        "diesel_car": 0.19,      # kg CO2e per mile
        "electric_car": 0.05,    # kg CO2e per mile
        "hybrid_car": 0.10,      # kg CO2e per mile
        "public_transit": 0.04,  # kg CO2e per mile
        "flight_short": 0.24,    # kg CO2e per mile
        "flight_long": 0.15,     # kg CO2e per mile
        "active": 0.0            # kg CO2e per mile (walk/bike)
    },
    "energy": {
        "electricity": 0.38,     # kg CO2e per kWh
        "natural_gas": 0.18,     # kg CO2e per kWh
        "coal": 0.95,            # kg CO2e per kWh
        "solar_wind": 0.01       # kg CO2e per kWh
    },
    "food": {
        "beef": 27.0,            # kg CO2e per serving
        "pork_poultry": 6.0,     # kg CO2e per serving
        "fish": 5.0,             # kg CO2e per serving
        "dairy": 3.0,            # kg CO2e per serving
        "vegetarian": 1.5,       # kg CO2e per serving
        "vegan": 0.7             # kg CO2e per serving
    },
    "shopping": {
        "clothing": 15.0,        # kg CO2e per item
        "electronics": 80.0,     # kg CO2e per item
        "furniture": 40.0,       # kg CO2e per item
        "misc": 5.0              # kg CO2e per item
    }
}

def calculate_emission(category: str, activity: str, value: float) -> float:
    category = category.lower()
    activity = activity.lower()
    
    if category not in EMISSION_FACTORS:
        return 0.0
    
    factor = EMISSION_FACTORS[category].get(activity, 0.0)
    return round(factor * value, 2)
