import numpy as np
import random
from datetime import datetime

# 1. Realistic Moroccan Regional Distribution (Approximate HCP percentages)
REGIONS = [
    "Casablanca-Settat", "Rabat-Salé-Kénitra", "Marrakech-Safi", 
    "Fès-Meknès", "Tanger-Tétouan-Al Hoceima", "Souss-Massa", 
    "Béni Mellal-Khénifra", "L'Oriental", "Drâa-Tafilalet", 
    "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab"
]
REGION_WEIGHTS = [0.20, 0.14, 0.13, 0.12, 0.10, 0.08, 0.07, 0.07, 0.04, 0.02, 0.02, 0.01]

# 2. Moroccan Age Distribution (Young population)
AGE_GROUPS = [(0, 14), (15, 24), (25, 59), (60, 90)]
AGE_WEIGHTS = [0.26, 0.16, 0.46, 0.12]

# 3. Urban vs Rural Split
MILIEUX = ["Urbain", "Rural"]
MILIEU_WEIGHTS = [0.63, 0.37]

# 4. Clinical Risk Levels (Simplified for PreventHub)
RISK_LEVELS = ["Low", "Medium", "High"]
RISK_WEIGHTS = [0.70, 0.20, 0.10] 

def generate_patients(num_patients=5000):
    print(f"Generating {num_patients} realistic Moroccan patient profiles...")
    patients = []
    
    for i in range(1, num_patients + 1):
        # Pick age bracket based on weight, then random age within bracket
        age_bracket = np.random.choice(len(AGE_GROUPS), p=AGE_WEIGHTS)
        min_age, max_age = AGE_GROUPS[age_bracket]
        age = random.randint(min_age, max_age)
        
        patient = {
            "id": i,
            "age": age,
            "region": np.random.choice(REGIONS, p=REGION_WEIGHTS),
            "milieu": np.random.choice(MILIEUX, p=MILIEU_WEIGHTS),
            "risk_level": np.random.choice(RISK_LEVELS, p=RISK_WEIGHTS)
        }
        patients.append(patient)
        
    return patients

if __name__ == "__main__":
    # In your actual FastAPI app, you would replace this print loop 
    # with a bulk SQLAlchemy insert to your PostgreSQL database.
    synthetic_population = generate_patients(10) # Testing with 10 first
    for p in synthetic_population:
        print(p)