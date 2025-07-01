from datetime import datetime
from random import randint, choice
from typing import Dict, Any, List
from markdown_it.rules_inline import image
from mcp.server.fastmcp import FastMCP
from proto.marshal.compat import map_composite_type_names
import os
from twilio.rest import Client

mcp = FastMCP("godrej_properties")
PROJECTS = {
    "Godrej_Nirvaan": {
        "name": "Godrej Nirvaan, Thane",
        "location": "Kalyan Junction (Near Mumbai-Nashik Expressway & Upcoming Metro)",
        "configurations": ["1BHK", "2BHK"],
        "price_range": (4500000, 9000000),
        "amenities": [
            "Mini Theater", "60+ Concierge Services", "50+ Lifestyle Amenities", "Kids Area",
            "Senior Citizen Zone", "Meditation Zones"
        ],
        "possession": "December 2024",
        "landmarks": ["Mumbai-Nashik Expressway", "Upcoming Metro", "Fortis Hospital", "Poddar School"],
        "image": "/static/images/godrej_nirvaan.jpg",
        "latitude": "19.2716176",
        "longitude": "72.99998",
        "floor_plan": {"image": "/static/images/godrej_nirvaan_floor_plan.jpg"},
        "brochure": "/static/pdfs/godrej_nirvaan_brochure.pdf"
    },
    "Godrej_Exquisite": {
        "name": "Godrej Exquisite, Thane",
        "location": "Ghodbunder Road (Near Upvan Lake, Hiranandani Hospital, R-Mall)",
        "configurations": ["2BHK", "3BHK"],
        "price_range": (15900000, 25000000),
        "amenities": [
            "Rooftop Horizon Pool", "Skyscape Gym", "Private Rooftop Amenities",
            "No Shared Walls", "Landscape Gardens"
        ],
        "possession": "September 2026",
        "landmarks": ["Upvan Lake", "Hiranandani Hospital", "R-Mall"],
        "image": "/static/images/godrej_exquisite.jpg",
        "latitude": "19.2518093",
        "longitude": "72.8908383",
        "floor_plan": {"image": "/static/images/godrej_exquisite_floor_plan.jpg"},
        "brochure": "/static/pdfs/godrej_exquisite_brochure.pdf"
    },
    "Godrej_Ascend": {
        "name": "Godrej Ascend, Thane",
        "location": "Kolshet Road (Near Viviana Mall & Jupiter Hospital)",
        "configurations": ["2BHK", "3BHK"],
        "price_range": (12500000, 20000000),
        "amenities": [
            "2 Clubhouses", "Sky Sports Arena", "Retail Plaza", "Central Greens", "Swimming Pool"
        ],
        "possession": "April 2028",
        "landmarks": ["Viviana Mall", "Jupiter Hospital", "Orchids International School"],
        "image": "/static/images/godrej_ascend.jpg",
        "latitude": "19.2285865",
        "longitude": "72.9006584",
        "floor_plan": {"image": "/static/images/godrej_ascend_floor_plan.jpg"},
        "brochure": "/static/pdfs/godrej_ascend_brochure.pdf"
    },
    "Godrej_Paradise": {
        "name": "Godrej Paradise,Thane",
        "location": "Vikhroli, Mumbai (Near DMart, Global Hospital, Majiwada Junction, near Orchids International school)",
        "configurations": ["2BHK", "3BHK"],
        "price_range": (22000000, 35000000),
        "amenities": ["Private Residences", "Clubhouse", "Swimming Pool", "Jogging Track"],
        "possession": "Ready-to-move",
        "landmarks": ["DMart", "Global Hospital", "Majiwada Junction", "Orchids International School"],
        "image": "/static/images/godrej_the_trees.jpg",
        "latitude": "19.0925544",
        "longitude": "72.838135",
        "floor_plan": {"image": "/static/images/godrej_the_trees_floor_plan.jpg"},
        "brochure": "/static/pdfs/godrej_the_trees_brochure.pdf"
    }
}

@mcp.tool()
def property_enquiry(project_name: str, phone: str = "") -> dict:
    try:
        project = PROJECTS.get(project_name)
        if not project:
            return {
                "message": f"Sorry, no information available for '{project_name}'."
            }

        return {
            "project_name": project["name"],
            "details": {
                "location": project["location"],
                "configurations": project["configurations"],
                "starting_price": min(project["price_range"]),
                "amenities": project["amenities"],
                "possession": project["possession"],
                "landmarks": project["landmarks"],
                "image": project["image"],
                "floor_plan": project["floor_plan"],
                "latitude": project["latitude"],
                "longitude": project["longitude"],
                "brochure": project["brochure"]
            },
            "message": f"Here are the details for {project['name']}."
        }

    except Exception as e:
        return {
            "message": "Unable to fetch project details at this time.",
            "error": str(e)
        }


@mcp.tool()
def property_recommendation(
    budget: int = 0,
    bhk: int = 2,
    location: str = "",
    preference: str = "",
    phone: str = ""
) -> dict:
    try:
        recommendations = []

        for p in PROJECTS.values():
            min_p, max_p = p["price_range"]

            # Price filter
            if not (min_p <= budget <= max_p):
                continue

            # BHK filter
            if f"{bhk}BHK" not in p["configurations"]:
                continue

            # Location filter (if provided)
            if location and location.lower() not in p["location"].lower():
                continue

            # Preference filter (if provided)
            if preference and not any(preference.lower() in amen.lower() for amen in p["amenities"]):
                continue

            recommendations.append({
                "name": p["name"],
                "starting_price": min_p,
                "location": p["location"],
                "floor_plan": p["floor_plan"],
                "image": p["image"],
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "brochure": p["brochure"]
            })

        return {
            "recommendations": recommendations,
            "message": (
                f"Recommended properties for ₹{budget:,} budget and {bhk}BHK"
                + (f" in {location}" if location else "")
                + (f" with preference '{preference}'" if preference else "")
                + (":" if recommendations else ": No matching properties found.")
            )
        }

    except Exception as e:
        return {
            "recommendations": [],
            "message": "Could not generate recommendations at the moment.",
            "error": str(e)
        }



from typing import Dict, Any
import logging
logger = logging.getLogger(__name__)


@mcp.tool()
def contact_sales_executive(phone_number: str, reason: str) -> Dict[str, Any]:

    try:
        return {
            "success": True,
            "data": {
                "user_phone_number": phone_number,
                "reason": reason,
                "confirmation_message": (
                    f"A Godrej sales executive will call you at {phone_number} within the next 10 minutes."
                ),
                "support_contact": {
                    "name": "Rohit Gupta",
                    "contact_number": "9900998800"
                }
            },
            "message": "Sales executive contact request registered successfully."
        }

    except Exception as e:
        logger.exception("Unexpected error while registering sales executive contact request")
        return {
            "success": False,
            "error": {
                "type": "InternalServerError",
                "code": 500,
                "message": "An unexpected error occurred while registering the request.",
                "details": str(e)
            }
        }


@mcp.tool()
def compare_properties(properties: List[str], preferences: Dict[str, Any] = None) -> Dict[str, Any]:
    result = []
    missing = []
    print("name ",properties)
    for name in properties:
        # key = normalize_project_name(name)
        if name in PROJECTS:
            p = PROJECTS[name]
            result.append(p)
        else:
            missing.append(name)

    return {
        "success": True,
        "data": result,
        "missing_projects": missing,
        "message": f"Comparison of {len(result)} project(s)."
                   + (f" Missing: {', '.join(missing)}" if missing else "")
    }

from typing import Dict, Any
import logging
logger = logging.getLogger(__name__)



def send_message(phone_number: str, message: str,url:str) -> Dict[str, Any]:
    try:
        # Simulate sending a message
        logger.info(f"Sending message to {phone_number}: {message}")
        # Download the helper library from https://www.twilio.com/docs/python/install
    
        # Find your Account SID and Auth Token at twilio.com/console
        # and set the environment variables. See http://twil.io/secure
        account_sid = os.environ["TWILIO_ACCOUNT_SID"]
        auth_token = os.environ["TWILIO_AUTH_TOKEN"]
        base_url=os.environ["BASE_URL"]
        client = Client(account_sid, auth_token)
        phone_number_string = f"whatsapp:+91{phone_number}"
        twilio_response = client.messages.create(
            body=message,
            media_url=f"{base_url}{url}",
            from_=f"whatsapp:+18283925450",
            to=f"whatsapp:+91{phone_number}"
        )

        print(twilio_response.body)
        return {
            "success": True,
            "data": {
                "phone_number": phone_number,
                "message": message,
                "twilio_response": twilio_response,
                "confirmation": "Message sent successfully."
            }
        }
    except Exception as e:
        logger.exception("Error sending message")
        return {
            "success": False,
            "error": {
                "type": "MessageSendError",
                "code": 500,
                "message": "Failed to send message.",
                "details": str(e)
            }
        }
@mcp.tool()
def book_property_visit(project_name: str, preferred_date: str, preferred_time: str, phone_number: str) -> Dict[str, Any]:
    try:
        project = PROJECTS.get(project_name)

        if not project:
            return {
                "success": False,
                "error": {
                    "type": "InvalidProjectError",
                    "code": 404,
                    "message": f"No project found with name '{project_name}'.",
                    "suggestion": "Please check the project name and try again."
                }
            }
        
        # Improved message structure with all visit details
        message = (
            f"Your property visit is confirmed!\n"
            f"Project: {project['name']}\n"
            f"Date: {preferred_date}\n"
            f"Time: {preferred_time}\n"
            f"Address: {project['location']}\n"
            f"Contact Person: Rohit Gupta\n"
            f"Contact Number: 9911992381\n"
        )
        send_message(phone_number, message, project["brochure"])
        response = {
            "success": True,
            "data": {
                "project_name": project["name"],
                "scheduled_datetime": f"{preferred_date} {preferred_time}",
                "project_address": project["location"],
                "contact_person": "Rohit Gupta",
                "contact_number": "9911992381",
                "user_phone_number": phone_number,
                "confirmation_message": "A confirmation SMS with location details will be sent to your number.",
                "brochure": project["brochure"]
            },
            "message": f"Visit booked successfully for {project['name']}."
        }
        return response

    except Exception as e:
        logger.exception("Unexpected error while booking property visit")
        return {
            "success": False,
            "error": {
                "type": "InternalServerError",
                "code": 500,
                "message": "An unexpected error occurred while booking the visit.",
                "details": str(e)
            }
        }


@mcp.tool()
def upload_image(file_type: str, description: str, file_url: str) -> Dict[str, Any]:
    return {
        "success": True,
        "data": {"file_type": file_type, "description": description, "file_url": file_url},
        "message": f"{file_type.capitalize()} uploaded successfully"
    }
