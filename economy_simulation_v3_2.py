"""
v3: Real elimination risk on Medium. Tighter starting provisions, harsher
food spoilage. Members should die from cumulative starvation more often.
"""
import random, statistics
from dataclasses import dataclass, field
from typing import List

STARTING_V3 = {
    'easy':   {'money': 35, 'food': 200, 'water': 30, 'supplies': 8, 'medicine': 3, 'wagon_hp': 100},
    'medium': {'money': 18, 'food': 140, 'water': 22, 'supplies': 5, 'medicine': 1, 'wagon_hp': 100},
    'hard':   {'money': 12, 'food': 110, 'water': 16, 'supplies': 3, 'medicine': 0, 'wagon_hp':  85},
}

PRICE = {
    'food_per_lb_fort':   0.12, 'water_per_gal_fort': 0.10,
    'medicine_per_dose':  3.50, 'supplies_per_unit':  1.20,
    'wagon_repair':       4.00, 'ferry':              6.00,
    'guide':              4.00, 'doctor_visit':       5.00,
}

SHOCKS = {
    'food_spoil': 0.16,  'water_spill': 0.16, 'supplies_lost': 0.10,
    'wagon_damage': 0.18, 'sickness_minor': 0.12, 'sickness_severe': 0.06,
    'bandit_demand': 0.06, 'cholera': 0.025, 'broken_axle': 0.04,
    'lost_trail': 0.05, 'theft': 0.03,
}
SHOCK_MAG = {
    'food_spoil': (25, 50), 'water_spill': (5, 14), 'supplies_lost': (1, 3),
    'wagon_damage': (15, 35), 'broken_axle': (50, 75), 'bandit_demand': (8, 22),
    'theft': (4, 12),
}

DAILY = {'food_lbs': 2.0, 'water_gal': 0.5}

@dataclass
class Wagon:
    money: float = 0; food: float = 0; water: float = 0
    supplies: float = 0; medicine: float = 0; wagon_hp: float = 100
    team_size: int = 7; professions: List[str] = field(default_factory=list)
    days_traveled: int = 0; members_lost: int = 0
    finished: bool = False; eliminated: bool = False
    log: List[str] = field(default_factory=list)
    money_spent: dict = field(default_factory=lambda: {
        'food':0,'water':0,'medicine':0,'repair':0,'ferry':0,'guide':0,'bandits':0,'theft':0,'misc':0
    })
    money_earned: dict = field(default_factory=lambda: {'hides':0,'food_sold':0,'labor':0})
    
    def alive(self): return self.team_size - self.members_lost
    def has(self, p): return p in self.professions

def starting_wagon(team, diff='medium'):
    s = dict(STARTING_V3[diff])
    if 'Banker' in team: s['money'] += 12
    if 'Doctor' in team: s['medicine'] += 1
    if 'Hunter' in team: s['food'] += 25
    if 'Cook' in team:   s['food'] += 15
    return Wagon(**s, professions=team)

def consume(w):
    n = w.alive()
    fmult = 0.78 if w.has('Cook') else 1.0
    fneed = n * DAILY['food_lbs'] * fmult
    wneed = n * DAILY['water_gal']
    
    food_short = max(0, fneed - w.food)
    water_short = max(0, wneed - w.water)
    
    w.food = max(0, w.food - fneed)
    w.water = max(0, w.water - wneed)
    
    # Cumulative starvation/dehydration risk
    if food_short > 0:
        chance = 0.05 + 0.08 * (food_short / fneed)
        if random.random() < chance:
            w.members_lost += 1
            w.log.append(f"D{w.days_traveled}: starvation death ({w.food:.0f}lb left)")
    if water_short > 0:
        chance = 0.07 + 0.10 * (water_short / wneed)
        if random.random() < chance:
            w.members_lost += 1
            w.log.append(f"D{w.days_traveled}: dehydration death ({w.water:.0f}gal left)")

def apply_shock(w):
    avoid = (0.30 if w.has('Guide') else 0) + (0.10 if w.has('Scout') else 0)
    if random.random() < avoid: return
    triggered = [s for s, p in SHOCKS.items() if random.random() < p]
    if not triggered: return
    s = random.choice(triggered)
    
    if s == 'food_spoil':
        loss = random.uniform(*SHOCK_MAG['food_spoil'])
        if w.has('Cook'): loss *= 0.55
        w.food = max(0, w.food - loss)
        w.log.append(f"D{w.days_traveled}: {loss:.0f} lbs food spoiled")
    elif s == 'water_spill':
        loss = random.uniform(*SHOCK_MAG['water_spill'])
        w.water = max(0, w.water - loss)
        w.log.append(f"D{w.days_traveled}: {loss:.1f} gal water lost")
    elif s == 'supplies_lost':
        loss = random.randint(*SHOCK_MAG['supplies_lost'])
        w.supplies = max(0, w.supplies - loss)
    elif s == 'wagon_damage':
        loss = random.uniform(*SHOCK_MAG['wagon_damage'])
        if w.has('Blacksmith'): loss *= 0.65
        w.wagon_hp = max(0, w.wagon_hp - loss)
    elif s == 'broken_axle':
        loss = random.uniform(*SHOCK_MAG['broken_axle'])
        w.wagon_hp = max(0, w.wagon_hp - loss)
        cost = 0 if w.has('Carpenter') else PRICE['wagon_repair'] * 2.5
        if w.money >= cost:
            w.money -= cost
            w.money_spent['repair'] += cost
            w.wagon_hp = min(100, w.wagon_hp + 50)
        else:
            # stuck: lose 2 days food/water
            w.food = max(0, w.food - 30); w.water = max(0, w.water - 6)
            w.log.append(f"D{w.days_traveled}: AXLE BROKEN — stranded")
    elif s == 'sickness_minor':
        if w.medicine > 0:
            w.medicine -= 1
        elif random.random() < 0.20:
            w.members_lost += 1
            w.log.append(f"D{w.days_traveled}: untreated sickness death")
    elif s == 'sickness_severe':
        need = 1 if w.has('Doctor') else 2
        if w.medicine >= need:
            w.medicine -= need
        else:
            chance = 0.32 if w.has('Doctor') else 0.60
            if random.random() < chance:
                w.members_lost += 1
                w.log.append(f"D{w.days_traveled}: severe sickness death")
    elif s == 'bandit_demand':
        d = random.uniform(*SHOCK_MAG['bandit_demand'])
        if w.money >= d:
            w.money -= d
            w.money_spent['bandits'] += d
        else:
            w.supplies = max(0, w.supplies - 2)
    elif s == 'cholera':
        chance = 0.10 if w.has('Doctor') else 0.30
        deaths = sum(1 for _ in range(w.alive()) if random.random() < chance)
        deaths = min(deaths, w.alive() - 1)
        w.members_lost += deaths
        if deaths > 0: w.log.append(f"D{w.days_traveled}: CHOLERA -{deaths}")
    elif s == 'lost_trail':
        if not (w.has('Guide') or w.has('Scout') or w.has('Surveyor')):
            w.food = max(0, w.food - 25); w.water = max(0, w.water - 4)
            w.log.append(f"D{w.days_traveled}: lost trail")
    elif s == 'theft':
        loss = random.uniform(*SHOCK_MAG['theft'])
        if w.money >= loss:
            w.money -= loss
            w.money_spent['theft'] += loss

def fort_visit(w):
    n = w.alive()
    daily_food = n * DAILY['food_lbs']
    daily_water = n * DAILY['water_gal']
    md = 0.85 if w.has('Merchant') else 1.0
    
    target_water = daily_water * 8
    if w.water < target_water:
        deficit = target_water - w.water
        cost_per = PRICE['water_per_gal_fort'] * md
        spend = min(deficit * cost_per, w.money * 0.4)
        gal = spend / cost_per
        w.money -= spend; w.money_spent['water'] += spend; w.water += gal
    
    target_food = daily_food * 9
    if w.food < target_food:
        deficit = target_food - w.food
        cost_per = PRICE['food_per_lb_fort'] * md
        spend = min(deficit * cost_per, w.money * 0.5)
        lbs = spend / cost_per
        w.money -= spend; w.money_spent['food'] += spend; w.food += lbs
    
    if w.medicine == 0 and w.money >= PRICE['medicine_per_dose']:
        w.money -= PRICE['medicine_per_dose']
        w.money_spent['medicine'] += PRICE['medicine_per_dose']
        w.medicine += 1
    
    if w.wagon_hp < 60:
        if w.has('Carpenter'):
            w.wagon_hp = min(100, w.wagon_hp + 50)
        elif w.money >= PRICE['wagon_repair']:
            cost = PRICE['wagon_repair'] * md
            w.money -= cost; w.money_spent['repair'] += cost
            w.wagon_hp = min(100, w.wagon_hp + 30)

def play(team, diff='medium'):
    w = starting_wagon(team, diff)
    forts = [4, 9, 14, 18]
    for day in range(1, 21):
        w.days_traveled = day
        consume(w)
        if w.alive() <= 0: w.eliminated = True; return w
        apply_shock(w)
        
        # Hunter brings food
        if w.has('Hunter') and random.random() < 0.32:
            w.food += 22
            w.money += 3  # implicit hide sale at next fort
            w.money_earned['hides'] += 3
        # Trapper - more hides, less food
        if w.has('Trapper') and random.random() < 0.28:
            w.food += 12
            w.money += 6
            w.money_earned['hides'] += 6
        # Farmer - foraging
        if w.has('Farmer') and random.random() < 0.20:
            w.food += 10
        
        # Day 12 ferry
        if day == 12:
            if w.money >= PRICE['ferry']:
                w.money -= PRICE['ferry']
                w.money_spent['ferry'] += PRICE['ferry']
            else:
                w.food = max(0, w.food - 20); w.supplies = max(0, w.supplies - 1)
                if random.random() < 0.18:
                    w.members_lost += 1
                    w.log.append(f"D{day}: drowning at ford")
        
        if day in forts: fort_visit(w)
        if w.alive() <= 0: w.eliminated = True; return w
    
    w.finished = True
    return w

def run_sim(n=500, team=None, diff='medium'):
    team = team or ['Hunter', 'Doctor']
    finished = elim = 0
    losses = []; end_money = []
    
    for _ in range(n):
        w = play(team, diff)
        if w.finished: finished += 1
        if w.eliminated: elim += 1
        losses.append(w.members_lost)
        end_money.append(w.money)
    
    return {
        'finish': finished/n*100, 'elim': elim/n*100,
        'avg_loss': statistics.mean(losses),
        'lost_at_least_1_pct': sum(1 for l in losses if l >= 1) / n * 100,
        'lost_3plus_pct': sum(1 for l in losses if l >= 3) / n * 100,
        'p25_money': sorted(end_money)[len(end_money)//4],
        'med_money': statistics.median(end_money),
    }

print(f"{'Team':30s} {'Diff':6s} {'Fin%':>5s} {'Elim%':>5s} {'AvgL':>5s} {'≥1Lost%':>8s} {'≥3L%':>5s} {'P25$':>5s}")
print("="*95)
for label, team in [
    ('No-skill (M+A)',   ['Musician', 'Artist']),
    ('Hunter only',      ['Hunter']),
    ('Hunter+Doctor',    ['Hunter', 'Doctor']),
    ('H+D+Carpenter',    ['Hunter', 'Doctor', 'Carpenter']),
    ('Strong (H+D+C+Cook)', ['Hunter', 'Doctor', 'Carpenter', 'Cook']),
    ('All-rounder',      ['Hunter', 'Doctor', 'Guide', 'Merchant']),
    ('Banker',           ['Banker', 'Hunter']),
]:
    for diff in ['easy', 'medium', 'hard']:
        r = run_sim(800, team, diff)
        print(f"{label:30s} {diff:6s} {r['finish']:>4.0f}% {r['elim']:>4.1f}% "
              f"{r['avg_loss']:>4.2f} {r['lost_at_least_1_pct']:>7.0f}% {r['lost_3plus_pct']:>4.0f}% "
              f"${r['p25_money']:>4.0f}")
