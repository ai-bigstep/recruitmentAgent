from datetime import datetime, timedelta
from random import randint
from typing import Dict, Any, List
import logging
import time
import requests
import difflib
from difflib import SequenceMatcher

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("wiki")

# Tata Motors Location APIs
# ---------------------------------------------
# 1. locate_nearest_showroom(city, purpose):
#    - Find nearest showroom or service center by city and purpose ('showroom' or 'service').
# 2. road_side_assistant_without_exact_location(issue_description, is_movable, landmark_or_address):
#    - Find nearby service centers using a landmark or address (no GPS required).
# 3. road_side_assistant_with_exact_location(issue_description, latitude, longitude, is_movable):
#    - Find nearby service centers or dispatch agent using exact GPS coordinates.
# ---------------------------------------------

@mcp.tool()
def book_test_drive(car_model: str, city: str, preferred_date: str) -> dict:
    """
    Books a test drive for a Tata Motors vehicle.

    Args:
        car_model: The model of the car (e.g., "Punch", "Nexon")
        city: The city where the test drive is requested
        preferred_date: The preferred date for the test drive

    Returns:
        A dictionary with booking confirmation details
    """
    try:
        # Normalize car model name
        car_models = ["Tiago", "Harrier", "Safari", "Punch", "Nexon", "Altroz"]
        normalized_model = next((model for model in car_models if model.lower() in car_model.lower()), car_model)

        # Generate a confirmation ID
        confirmation_id = f"TD{randint(1000, 9999)}"

        logger.info(f"Test drive booked for {normalized_model} in {city} on {preferred_date}")

        return {
            "tool_called": f"book_test_drive",
            "message": f"Test drive for {normalized_model} has been booked in {city} on {preferred_date}.",
            "confirmation_id": confirmation_id,
            "car_model": normalized_model,
            "city": city,
            "date": preferred_date,
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        logger.error(f"Error booking test drive: {str(e)}")
        # Always return a valid response even if there's an error
        return {
            "tool_called": f"book_test_drive",
            "message": f"Test drive for {car_model} has been booked in {city} on {preferred_date}.",
            "confirmation_id": f"TD{randint(1000, 9999)}",
            "car_model": car_model,
            "city": city,
            "date": preferred_date,
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def check_test_drive_status() -> dict:
    """
    Checks the status of a test drive booking.

    Args:
        None

    Returns:
        A dictionary with test drive booking status details
    """
    try:
        # Always assume there's a booking for demo purposes
        # Randomly select a car model
        car_models = ["Tiago", "Harrier", "Safari", "Punch", "Nexon", "Altroz"]
        car_model = car_models[randint(0, len(car_models) - 1)]

        # Generate a future date for the test drive
        future_date = (datetime.now() + timedelta(days=randint(1, 10))).strftime("%Y-%m-%d")

        # Generate a random city
        cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"]
        city = cities[randint(0, len(cities) - 1)]

        # Generate a confirmation ID
        confirmation_id = f"TD{randint(1000, 9999)}"

        logger.info(f"Test drive status checked: Found booking for {car_model}")

        return {
            "tool_called": f"check_test_drive_status",
            "status": "booked",
            "car_model": car_model,
            "city": city,
            "date": future_date,
            "confirmation_id": confirmation_id,
            "message": f"Your test drive for {car_model} is scheduled on {future_date} in {city}.",
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        logger.error(f"Error checking test drive status: {str(e)}")
        # Always return a valid response even if there's an error
        return {
            "tool_called": f"check_test_drive_status",
            "status": "booked",
            "car_model": "Nexon",
            "city": "Mumbai",
            "date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "confirmation_id": f"TD{randint(1000, 9999)}",
            "message": "Your test drive for Nexon is scheduled.",
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def request_service_booking(car_model: str, city: str, preferred_date: str) -> dict:
    try:
        booking_id = "SERV2288"
        return {
            "tool_called": f"request_service_booking",
            "message": f"Service booking for {car_model} confirmed in {city} on {preferred_date}.",
            "booking_id": booking_id,
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        return {
            "tool_called": f"request_service_booking",
            "message": "Unable to schedule service at the moment.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def check_service_status() -> dict:
    try:
        booked = True
        if booked:
            return {
                "tool_called": f"check_service_status",
                "status": "booked",
                "car_model": "Punch CNG",
                "city": "Ahmedabad",
                "date": "2025-05-30",
                "booking_id": "SERV2288",
                "message": "Service for your Punch CNG is scheduled.",
                "ticket_id": "TATA1001"
            }
        else:
            return {
                "tool_called": f"check_service_status",
                "status": "not_found",
                "message": "No service booking found.",
                "ticket_id": "TATA1001"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": "Unable to fetch service booking status.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def track_car_delivery(order_id: str) -> dict:
    try:
        return {
            "tool_called": f"track_car_delivery",
            "order_id": order_id,
            "status": "Shipped",
            "expected_delivery": "2025-06-10",
            "location": "En route to Mumbai warehouse",
            "message": "Your car is en route and will arrive by 10th June.",
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        return {
            "tool_called": f"track_car_delivery",
            "message": "Unable to track your car delivery at this time.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def car_recommendation(
    budget: str = "",
    usage_type: str = "",
    family_size: str = "4"
) -> dict:
    """
    Recommends Tata cars based on user preferences.

    Args:
        budget: Budget in lakhs (e.g., "7 lakh", "10 lakh")
        usage_type: Type of usage (city, highway, offroad, etc.)
        family_size: Number of family members (e.g., "4", "6")

    Returns:
        A dictionary with car recommendations
    """
    try:
        all_cars = {
            "Tiago": {
                "name": "Tiago",
                "description": "A compact hatchback ideal for city commuting.",
                "base_price": "₹5.6 Lakh",
                "price_range": "₹5.6 - 8.0 Lakh",
                "mileage": "19-26 kmpl",
                "engine": "1.2L Petrol/CNG",
                "safety": "4-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Hatchback",
                "features": ["Harman Infotainment System", "Automatic Climate Control", "Dual Airbags"],
                "image": "/static/images/tiago.jpg",
                "brochure": "/static/pdfs/tiago_brochure.pdf"
            },
            "Altroz": {
                "name": "Altroz",
                "description": "Premium hatchback with excellent safety features.",
                "base_price": "₹6.5 Lakh",
                "price_range": "₹6.5 - 10.0 Lakh",
                "mileage": "19-25 kmpl",
                "engine": "1.2L Petrol/1.5L Diesel",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Premium Hatchback",
                "features": ["Floating Island Infotainment System", "Automatic Headlamps", "Cruise Control"],
                "image": "/static/images/altroz.jpg",
                "brochure": "/static/pdfs/altroz_brochure.pdf"
            },
            "Punch": {
                "name": "Punch",
                "description": "A compact SUV with high ground clearance and city-friendly dimensions.",
                "base_price": "₹6.0 Lakh",
                "price_range": "₹6.0 - 9.5 Lakh",
                "mileage": "18-26 kmpl",
                "engine": "1.2L Petrol/CNG",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Micro SUV",
                "features": ["7-inch Harman Touchscreen", "iRA Connected Car Tech", "Cruise Control"],
                "image": "/static/images/punch.jpg",
                "brochure": "/static/pdfs/punch_brochure.pdf"
            },
            "Nexon": {
                "name": "Nexon",
                "description": "Stylish compact SUV with excellent safety and features.",
                "base_price": "₹8.0 Lakh",
                "price_range": "₹8.0 - 14.0 Lakh",
                "mileage": "17-24 kmpl",
                "engine": "1.2L Turbo Petrol/1.5L Diesel",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Compact SUV",
                "features": ["10.25-inch Touchscreen", "Wireless Android Auto & Apple CarPlay",
                             "Electronic Parking Brake"],
                "image": "/static/images/nexon.jpg",
                "brochure": "/static/pdfs/nexon_brochure.pdf"
            },
            "Harrier": {
                "name": "Harrier",
                "description": "A premium mid-size SUV with commanding road presence.",
                "base_price": "₹15.0 Lakh",
                "price_range": "₹15.0 - 24.0 Lakh",
                "mileage": "14-17 kmpl",
                "engine": "2.0L Diesel",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Mid-size SUV",
                "features": ["Panoramic Sunroof", "JBL Premium Audio", "ADAS"],
                "image": "/static/images/harrier.jpg",
                "brochure": "/static/pdfs/harrier_brochure.pdf"
            },
            "Safari": {
                "name": "Safari",
                "description": "Flagship 7-seater SUV with premium features and comfort.",
                "base_price": "₹16.0 Lakh",
                "price_range": "₹16.0 - 25.0 Lakh",
                "mileage": "14-16.5 kmpl",
                "engine": "2.0L Diesel",
                "safety": "5-star expected rating",
                "seating": "6/7 seater",
                "body_type": "Full-size SUV",
                "features": ["Boss Mode", "Panoramic Sunroof", "6/7 Seating Configuration"],
                "image": "/static/images/safari.jpg",
                "brochure": "/static/pdfs/safari_brochure.pdf"
            },
        }

        # Parse budget
        import re
        budget_value = 0
        try:
            if budget is None or budget == "":
                budget_value = 0
            elif isinstance(budget, (int, float)):
                budget_value = int(budget)
            else:
                numbers = re.findall(r'\d+', str(budget))
                if numbers:
                    budget_value = int(numbers[0])
        except Exception as e:
            budget_value = 7

        # Parse family size
        family_size_value = 4
        try:
            if family_size is None or family_size == "":
                family_size_value = 4
            elif isinstance(family_size, (int, float)):
                family_size_value = int(family_size)
            else:
                numbers = re.findall(r'\d+', str(family_size))
                if numbers:
                    family_size_value = int(numbers[0])
        except Exception as e:
            family_size_value = 4

        # Scoring logic
        scored_cars = []
        for car, details in all_cars.items():
            score = 0
            # Budget scoring
            car_base_price = int(re.findall(r'\d+', details["base_price"])[0])
            if budget_value > 0:
                if car_base_price <= budget_value:
                    score += 2
                elif car_base_price - budget_value <= 2:
                    score += 1
            # Usage type scoring
            if usage_type:
                if "city" in usage_type.lower() and ("Hatchback" in details["body_type"] or "Micro SUV" in details["body_type"]):
                    score += 2
                if "highway" in usage_type.lower() and ("SUV" in details["body_type"] or "Premium Hatchback" in details["body_type"]):
                    score += 1
            # Family size scoring
            if family_size_value >= 6 and ("7 seater" in details["seating"] or "6/7 seater" in details["seating"]):
                score += 2
            elif family_size_value >= 4 and "5 seater" in details["seating"]:
                score += 1
            scored_cars.append((score, car))

        # Sort cars by score (descending) and pick top 4
        scored_cars.sort(reverse=True)
        top_cars = [car for score, car in scored_cars if score > 0][:4]
        if not top_cars:
            top_cars = ["Punch", "Nexon"]

        recommendations = [all_cars[car] for car in top_cars]

        return {
            "tool_called": f"car_recommendation",
            "recommendations": recommendations,
            "message": f"Based on your preferences, we recommend: {', '.join(top_cars)}.",
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        default_recommendations = ["Punch", "Nexon"]
        return {
            "tool_called": f"car_recommendation",
            "recommendations": [all_cars[car] for car in default_recommendations],
            "message": f"Based on your preferences, we recommend: {', '.join(default_recommendations)}.",
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def car_info(car_model: str) -> dict:
    """
    Provides detailed information about a specific Tata car model.

    Args:
        car_model: The model of the car to get information about

    Returns:
        A dictionary with detailed information about the car model
    """
    try:
        # Comprehensive car database with detailed information
        info_db = {
            "Tiago": {
                "engine": "1.2L Petrol/CNG",
                "mileage": "23-27 km/l",
                "price": "₹5.5 Lakhs onwards",
                "price_range": "₹5.5 - 8.0 Lakh",
                "safety": "4-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Hatchback",
                "transmission": "Manual and AMT options",
                "ground_clearance": "170 mm",
                "boot_space": "242 liters",
                "fuel_type": "Petrol, CNG",
                "features": ["7-inch Touchscreen Infotainment", "Automatic Climate Control", "Dual Airbags",
                             "ABS with EBD", "Harman Audio"],
                "colors": ["Daytona Grey", "Flame Red", "Pure Silver", "Arizona Blue", "Opal White"],
                "image": "/static/images/tiago.jpg",
                "brochure": "/static/pdfs/tiago_brochure.pdf"
            },
            "Altroz": {
                "engine": "1.2L Petrol/1.5L Diesel",
                "mileage": "19-25 km/l",
                "price": "₹6.5 Lakhs onwards",
                "price_range": "₹6.5 - 10.0 Lakh",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Premium Hatchback",
                "transmission": "Manual and DCT options",
                "ground_clearance": "165 mm",
                "boot_space": "345 liters",
                "fuel_type": "Petrol, Diesel, CNG",
                "features": ["7-inch Floating Island Touchscreen", "Leatherette Seats", "Cruise Control",
                             "iRA Connected Car Tech", "Automatic Headlamps"],
                "colors": ["High Street Gold", "Avenue White", "Downtown Red", "Arcade Grey", "Harbour Blue"],
                "image": "/static/images/altroz.jpg",
                "brochure": "/static/pdfs/altroz_brochure.pdf"
            },
            "Punch": {
                "engine": "1.2L Petrol/CNG",
                "mileage": "18-26 km/l",
                "price": "₹6.0 Lakhs onwards",
                "price_range": "₹6.0 - 9.5 Lakh",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Micro SUV",
                "transmission": "Manual and AMT options",
                "ground_clearance": "187 mm",
                "boot_space": "366 liters",
                "fuel_type": "Petrol, CNG",
                "features": ["7-inch Harman Touchscreen", "iRA Connected Car Tech", "Cruise Control", "Auto Headlamps",
                             "Rain-sensing Wipers"],
                "colors": ["Atomic Orange", "Tropical Mist", "Meteor Bronze", "Tornado Blue", "Pristine White"],
                "image": "/static/images/punch.jpg",
                "brochure": "/static/pdfs/punch_brochure.pdf"
            },
            "Nexon": {
                "engine": "1.2L Turbo Petrol/1.5L Diesel",
                "mileage": "17-24 km/l",
                "price": "₹8.0 Lakhs onwards",
                "price_range": "₹8.0 - 14.0 Lakh",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Compact SUV",
                "transmission": "Manual, AMT, and DCT options",
                "ground_clearance": "208 mm",
                "boot_space": "382 liters",
                "fuel_type": "Petrol, Diesel",
                "features": ["10.25-inch Touchscreen", "Wireless Android Auto & Apple CarPlay",
                             "Electronic Parking Brake", "Ventilated Seats", "Air Purifier"],
                "colors": ["Flame Red", "Pure Silver", "Daytona Grey", "Calgary White", "Fearless Purple"],
                "image": "/static/images/nexon.jpg",
                "brochure": "/static/pdfs/nexon_brochure.pdf"
            },
            "Harrier": {
                "engine": "2.0L Diesel",
                "mileage": "14-17 km/l",
                "price": "₹15.0 Lakhs onwards",
                "price_range": "₹15.0 - 24.0 Lakh",
                "safety": "5-star Global NCAP rating",
                "seating": "5 seater",
                "body_type": "Mid-size SUV",
                "transmission": "Manual and Automatic options",
                "ground_clearance": "205 mm",
                "boot_space": "425 liters",
                "fuel_type": "Diesel",
                "features": ["Panoramic Sunroof", "JBL Premium Audio", "ADAS", "10.25-inch Touchscreen",
                             "360-degree Camera"],
                "colors": ["Oberon Black", "Calypso Red", "Lunar White", "Grassland Beige", "Tropical Mist"],
                "image": "/static/images/harrier.jpg",
                "brochure": "/static/pdfs/harrier_brochure.pdf"
            },
            "Safari": {
                "engine": "2.0L Diesel",
                "mileage": "14-16.5 km/l",
                "price": "₹16.0 Lakhs onwards",
                "price_range": "₹16.0 - 25.0 Lakh",
                "safety": "5-star expected rating",
                "seating": "6/7 seater",
                "body_type": "Full-size SUV",
                "transmission": "Manual and Automatic options",
                "ground_clearance": "205 mm",
                "boot_space": "447 liters (with 3rd row folded)",
                "fuel_type": "Diesel",
                "features": ["Boss Mode", "Panoramic Sunroof", "6/7 Seating Configuration", "ADAS",
                             "JBL Premium Audio"],
                "colors": ["Cosmic Gold", "Oberon Black", "Lunar White", "Galactic Sapphire", "Tropical Mist"],
                "image": "/static/images/safari.jpg",
                "brochure": "/static/pdfs/safari_brochure.pdf"
            },
        }

        # Normalize car model name for case-insensitive matching
        car_models = ["Tiago", "Harrier", "Safari", "Punch", "Nexon", "Altroz"]
        normalized_model = next((model for model in car_models if model.lower() in car_model.lower()), None)

        if not normalized_model:
            # If no match found, default to Punch for demo purposes
            normalized_model = "Punch"
            logger.warning(f"Car model {car_model} not found, defaulting to {normalized_model}")
        else:
            logger.info(f"Car info requested for {normalized_model}")

        car_details = info_db.get(normalized_model)

        return {
            "tool_called": f"car_info",
            "car_model": normalized_model,
            "details": car_details,
            "message": f"Here are the details for {normalized_model}.",
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        logger.error(f"Error fetching car info: {str(e)}")
        # Always return valid data even if there's an error
        default_model = "Punch"
        return {
            "tool_called": f"car_info",
            "car_model": default_model,
            "details": {
                "engine": "1.2L Petrol/CNG",
                "mileage": "18-26 km/l",
                "price": "₹6.0 Lakhs onwards",
                "safety": "5-star Global NCAP rating",
                "features": ["7-inch Harman Touchscreen", "iRA Connected Car Tech", "Cruise Control"]
            },
            "message": f"Here are the details for {default_model}.",
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def compare_cars(car1: str, car2: str) -> dict:
    try:
        info_db = {
            "Tiago": {
                "engine": "1.2L Petrol",
                "mileage": "23 km/l",
                "price": "₹5.5 Lakhs onwards",
                "features": ["Touchscreen Infotainment", "ABS", "Airbags"],
                "image": "/static/images/tiago.jpg",
                "brochure": "/static/pdfs/tiago_brochure.pdf"
            },
            "Harrier": {
                "engine": "2.0L Diesel",
                "mileage": "16 km/l",
                "price": "₹14.0 Lakhs onwards",
                "features": ["Sunroof", "Cruise Control", "7 airbags"],
                "image": "/static/images/harrier.jpg",
                "brochure": "/static/pdfs/harrier_brochure.pdf"
            },
            "Safari": {
                "engine": "2.0L Diesel",
                "mileage": "15 km/l",
                "price": "₹16.5 Lakhs onwards",
                "features": ["Panoramic Sunroof", "Terrain Response", "6 airbags"],
                "image": "/static/images/safari.jpg",
                "brochure": "/static/pdfs/safari_brochure.pdf"
            },
            "Punch": {
                "engine": "1.2L Petrol/CNG",
                "mileage": "20 km/l",
                "price": "₹6.5 Lakhs onwards",
                "features": ["Smart Play Studio", "ABS", "Airbags"],
                "image": "/static/images/punch.jpg",
                "brochure": "/static/pdfs/punch_brochure.pdf"
            },
            "Nexon": {
                "engine": "1.5L Petrol/Diesel",
                "mileage": "18 km/l",
                "price": "₹7.5 Lakhs onwards",
                "features": ["Dual Airbags", "Touchscreen", "ESC"],
                "image": "/static/images/nexon.jpg",
                "brochure": "/static/pdfs/nexon_brochure.pdf"
            },
        }

        c1 = info_db.get(car1.title())
        c2 = info_db.get(car2.title())

        if not c1 or not c2:
            return {
                "message": f"One or both car models not found in the database.",
                "available_models": list(info_db.keys()),
                "ticket_id": "TATA1002"
            }

        def compare_field(field):
            return {
                "car1": c1[field],
                "car2": c2[field],
                "difference": "Same" if c1[field] == c2[field] else "Different"
            }

        comparison = {
            "engine": compare_field("engine"),
            "mileage": compare_field("mileage"),
            "price": compare_field("price"),
            "features": compare_field("features"),
            "images": compare_field("image"),
            "brochure": compare_field("brochure")
            # "features_only_in_car2":compare_field("features")
            # "features_only_in_car1": list(set(c1["features"]) - set(c2["features"])),
            # "features_only_in_car2": list(set(c2["features"]) - set(c1["features"])),
        }

        return {
            "tool_called": f"compare_cars",
            "car1": car1.title(),
            "car2": car2.title(),
            "comparison": comparison,
            "message": f"Comparison between {car1.title()} and {car2.title()} completed.",
            "ticket_id": "TATA1002"
        }

    except Exception as e:
        return {
            "tool_called": f"compare_cars",
            "message": "Unable to compare car details at this time.",
            "error": str(e),
            "ticket_id": "TATA1002"
        }


@mcp.tool()
def locate_nearest_showroom(city: str, purpose: str) -> dict:
    """
    Find the nearest Tata Motors showroom or service center by city and purpose.
    Args:
        city (str): The city to search in (e.g., 'Mumbai', 'Delhi').
        purpose (str): Either 'showroom' or 'service'.
    Returns:
        dict: JSON with the nearest showroom/service center name, city, and purpose.
    """
    try:
        showroom_name = "TATA Motors World"
        message = f"{showroom_name} in {city}."

        return {
            "tool_called": f"locate_nearest_showroom",
            "showroom_name": showroom_name,
            "city": city,
            "purpose": purpose,
            "message": message,
            "ticket_id": "TATA1001"
        }
    except Exception as e:
        return {
            "tool_called": f"locate_nearest_showroom",
            "message": "Unable to locate showroom at this time.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def capture_location_and_status(latitude: str, longitude: str, is_movable: str) -> dict:
    """
    Captures and validates location and car mobility status.

    Args:
        latitude (str): Latitude as string.
        longitude (str): Longitude as string.
        is_movable (str): 'true' or 'false' string indicating if the car is movable.
    """
    try:
        # lat = float(latitude)
        # lon = float(longitude)
        # is_movable_bool = is_movable.lower() == 'true'

        return {
            "tool_called": f"capture_location_and_status",
            "message": "Location and status captured successfully.",
            "latitude": latitude,
            "longitude": longitude,
            "is_movable": is_movable
        }
    except ValueError as ve:
        return {
            "message": "Invalid input. Please provide valid coordinates and mobility status.",
            "error": str(ve)
        }


def get_address_from_coordinates(lat: float, lon: float) -> dict:
    """
    Get address information using OpenStreetMap's Nominatim service.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Dictionary containing address information
    """
    try:
        # Add delay to respect Nominatim's usage policy (1 request per second)
        time.sleep(1)

        # Construct the URL for reverse geocoding
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"

        # Add User-Agent header as required by Nominatim's usage policy
        headers = {
            'User-Agent': 'TataMotorsLocationService/1.0'
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        data = response.json()

        # Extract address components
        address = data.get('address', {})
        print("address ", address)
        return {
            'formatted_address': data.get('display_name', ''),
            'city': address.get('city') or address.get('town') or address.get('village') or '',
            'state': address.get('state', ''),
            'country': address.get('country', ''),
            'postcode': address.get('postcode', '')
        }
    except Exception as e:
        logger.error(f"Error getting address from coordinates: {str(e)}")
        return {'error': 'Failed to get address information'}


def string_similarity(a: str, b: str) -> float:
    """Simple string similarity for keyword matching."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


@mcp.tool()
def road_side_assistant_without_exact_location(issue_description: str, is_movable: str,
                                               landmark_or_address: str) -> dict:
    """
    Handles roadside assistance using only a landmark or vague address (no GPS available).
    """
    try:
        is_movable_bool = is_movable.lower() == 'true'
        ticket_id = "RSA" + str(abs(hash(f"{issue_description}{landmark_or_address}")) % 100000)

        # Step 1: Hardcoded service centers with their full addresses
        service_centers = [
            {
                "name": "AutoCare Garage",
                "address": "AutoCare Garage, MG Road, Gurgaon, Haryana",
                "similarity_score": 0.0  # Placeholder for similarity score
            },
            {
                "name": "QuickFix Hub",
                "address": "QuickFix Hub, Sector 18, Noida, Uttar Pradesh",
                "similarity_score": 0.0  # Placeholder for similarity score
            },
            {
                "name": "RapidRescue Works",
                "address": "RapidRescue Works, Connaught Place, New Delhi",
                "similarity_score": 0.0  # Placeholder for similarity score
            }
        ]

        if is_movable_bool:
            # Step 2: Add similarity scores
            for center in service_centers:
                center["similarity_score"] = string_similarity(landmark_or_address, center["address"])

            # Step 3: Sort by similarity
            service_centers = sorted(service_centers, key=lambda x: x["similarity_score"], reverse=True)

            return {
                "tool_called": "road_side_assistant",
                "Description": issue_description,
                "message": "Nearby service centers located. Since your car is movable, here are your best matches.",
                "matched_on": landmark_or_address,
                "service_centers": service_centers,
                "ticket_id": ticket_id
            }

        else:
            # Car is immobile — dispatch agent
            return {
                "tool_called": "road_side_assistant",
                "message": "A roadside assistance agent is on the way to your location.",
                "location_details_provided": landmark_or_address,
                "agent_eta_minutes": 25,
                "ticket_id": ticket_id
            }

    except Exception as e:
        return {
            "tool_called": "road_side_assistant",
            "message": "There was an error processing your roadside assistance request.",
            "error": str(e),
            "ticket_id": "RSA0000"
        }


@mcp.tool()
def road_side_assistant_with_exact_location(issue_description: str, latitude: str, longitude: str,
                                            is_movable: str) -> dict:
    """
    Handles roadside assistance requests based on the issue, user's location, and car mobility status.
    Dynamically finds service centers or dispatches an agent accordingly.

    Args:
        issue_description (str): Description of the roadside issue
        latitude (str): Latitude coordinate as string
        longitude (str): Longitude coordinate as string
        is_movable (str): String indicating if vehicle is movable ('true' or 'false')
    """
    try:
        # Convert string inputs to appropriate types
        try:
            lat = float(latitude)
            lon = float(longitude)
            is_movable_bool = is_movable.lower() == 'true'
        except ValueError as ve:
            return {
                "message": "Invalid input format. Please provide valid coordinates and mobility status.",
                "error": str(ve),
                "ticket_id": "RSA0000"
            }

        # Get address information from coordinates
        address_info = get_address_from_coordinates(lat, lon)
        print("Address info.... ", address_info['formatted_address'])
        display_address = address_info["formatted_address"]

        # Generate ticket ID based on location and issue
        ticket_id = "RSA" + str(abs(hash(f"{latitude}{longitude}{issue_description}")) % 100000)
        print("ticket id ", ticket_id)
        print(" issue_description ", issue_description)

        if is_movable_bool:
            # Dynamically find nearby service centers
            service_centers = [
                {
                    "name": "AutoCare Garage",
                    "latitude": lat + 0.005,
                    "longitude": lon + 0.007,
                    "address": get_address_from_coordinates(lat + 0.005, lon + 0.007)["formatted_address"]
                },
                {
                    "name": "QuickFix Hub",
                    "latitude": lat - 0.004,
                    "longitude": lon - 0.006,
                    "address": get_address_from_coordinates(lat - 0.004, lon - 0.006)["formatted_address"]
                }
            ]

            return {
                "tool_called": f"road_side_assistant_with_exact_location",
                "Description": issue_description,
                "message": "Nearby service centers located. Since your car is movable, here are your options.",
                "service_centers": service_centers,
                "ticket_id": ticket_id
            }
        else:
            return {
                "tool_called": f"road_side_assistant_with_exact_location",
                "message": "A roadside assistance agent is on the way to your location.",
                "agent_eta_minutes": 25,
                "address": display_address,
                "ticket_id": ticket_id
            }
    except Exception as e:
        return {
            "tool_called": f"road_side_assistant_with_exact_location",
            "message": "There was an error processing your roadside assistance request.",
            "error": str(e),
            "ticket_id": "RSA0000"
        }


@mcp.tool()
def handle_roadside_images(image_base64: str, description: str) -> dict:
    """
    Receives and stores user-submitted car damage images with context.
    """
    try:
        image_id = "IMG" + str(abs(hash(image_base64)) % 100000)
        print("desc", description)
        print("image_data", image_base64)
        return {
            "tool_called": f"handle_roadside_images",
            "message": f"Image received successfully. We've added it to your assistance ticket. {description}",
            "image_id": image_id,
            "status": "stored"
        }
    except Exception as e:
        return {
            "tool_called": f"handle_roadside_images",
            "message": "Failed to process the image.",
            "error": str(e),
            "image_id": "IMG0000"
        }


@mcp.tool()
def handle_video_upload(video_base64: str, description: str) -> dict:
    """
    Receives and stores user-submitted car damage video with context.
    """
    try:
        video_id = "VID" + str(abs(hash(video_base64)) % 100000)
        print("desc", description)
        print("video_data", video_base64)
        return {
            "tool_called": f"handle_video_upload",
            "message": f"Video received successfully. We've added it to your assistance ticket. {description}",
            "video_id": video_id,
            "status": "stored"
        }
    except Exception as e:
        return {
            "tool_called": f"handle_video_upload",
            "message": "Failed to process the video.",
            "error": str(e),
            "video_id": "VID0000"
        }


@mcp.tool()
def handle_service_request_with_home_pickup(
        car_number: str,
        car_model: str,
        description: str,
        requirements: List[str],
        confirm_date: str,
        confirm_time: str,
        latitude: str,
        longitude: str
) -> dict:
    """
    Handles service requests for Tata Motors cars with detailed information and home pickup option.

    Args:
        car_number: The registration number of the car
        car_model: The model of the car to be serviced
        description: Description of the issue or service request
        requirements: List of specific service requirements (e.g., oil change, tire rotation)
        confirm_date: Confirmed date for the service
        confirm_time: Confirmed time for the service
        latitude: Latitude of the car's location
        longitude: Longitude of the car's location

    Returns:
        A dictionary with service booking details
    """
    try:
        booking_id = "SERV" + str(randint(1000, 9999))
        return {
            "tool_called": f"handle_service_request",
            "message": f"Service booking for car {car_number} ({car_model}) confirmed on {confirm_date} at {confirm_time}.",
            "description": description,
            "requirements": requirements,
            "latitude": latitude,
            "longitude": longitude,
            "booking_id": booking_id,
            "ticket_id": "TATA1001",
            "address": get_address_from_coordinates(float(latitude), float(longitude))["formatted_address"],
            "contact": "+911234567890"
        }
    except Exception as e:
        return {
            "tool_called": f"handle_service_request",
            "message": "Unable to schedule service at the moment.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }


@mcp.tool()
def recognize_defective_part_and_find_replacement(recognized_part: str) -> dict:
    """
    Recognizes defective car parts from an image and suggests replacements,
    even if the part name is an approximate match.

    Args:
        recognized_part: The name of the recognized part (e.g., "Brake Pad", "Air Filter")

    Returns:
        A dictionary with recognized part, replacement suggestions, and purchase links
    """
    try:
        parts_db = {
            "Brake Pad": {
                "replacement": "Tata Genuine Brake Pad - ₹1500",
                "link": "https://www.tatamotors.com/brake-pad"
            },
            "Air Filter": {
                "replacement": "Tata Genuine Air Filter - ₹500",
                "link": "https://www.tatamotors.com/air-filter"
            },
            "Oil Filter": {
                "replacement": "Tata Genuine Oil Filter - ₹700",
                "link": "https://www.tatamotors.com/oil-filter"
            },
            "Headlight": {
                "replacement": "Tata Genuine Headlight Assembly - ₹2500",
                "link": "https://www.tatamotors.com/headlight"
            },
            "Battery": {
                "replacement": "Tata Genuine Battery - ₹4500",
                "link": "https://www.tatamotors.com/battery"
            },
            "Windshield Wiper": {
                "replacement": "Tata Genuine Wiper Blade - ₹800",
                "link": "https://www.tatamotors.com/windshield-wiper"
            },
        }

        # Normalize input
        recognized_part_clean = recognized_part.strip().lower()

        # Build lookup map with lowercase keys
        part_names = list(parts_db.keys())
        part_name_map = {p.lower(): p for p in part_names}

        # Find best match
        close_matches = difflib.get_close_matches(recognized_part_clean, part_name_map.keys(), n=1, cutoff=0.6)

        if close_matches:
            matched_key = part_name_map[close_matches[0]]
            part_info = parts_db[matched_key]
            return {
                "tool_called": "recognize_defective_part_and_find_replacement",
                "message": f"Recognized '{recognized_part}' (matched to '{matched_key}'). Suggested replacement: {part_info['replacement']}.",
                "purchase_link": part_info["link"],
                "ticket_id": "TATA1001"
            }
        else:
            return {
                "tool_called": "recognize_defective_part_and_find_replacement",
                "message": f"Recognized '{recognized_part}'. Replacement part not found in known list.",
                "ticket_id": "TATA1001"
            }

    except Exception as e:
        return {
            "tool_called": "recognize_defective_part_and_find_replacement",
            "message": "Unable to recognize part or suggest replacement at this time.",
            "error": str(e),
            "ticket_id": "TATA1001"
        }
