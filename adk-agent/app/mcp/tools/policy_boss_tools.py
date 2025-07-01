from datetime import datetime, timedelta
from random import randint
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("wiki")

@mcp.tool()
def fetch_insurance_quote(insurance_type: str, age: int) -> Dict[str, Any]:
    """
    Fetches a mock insurance quote based on user's input with detailed breakdown.

    This function generates a realistic insurance quote based on the type of insurance and applicant's age,
    including base rate calculations, age factors, and validity period. The quote includes a detailed
    breakdown of coverage components.

    Args:
        insurance_type (str): Type of insurance (health, car, life, travel, etc.)
        age (int): Age of the insured person (must be between 18-100)

    Returns:
        Dict[str, Any]: Dictionary containing:
            - quote_amount: Formatted premium amount
            - coverage_details: Breakdown of coverage components
            - validity: Quote expiration date
            - factors: Calculation factors applied

    Raises:
        ValueError: If invalid insurance type or age is provided
        Exception: For any unexpected errors during quote generation
    """
    try:
        if age < 18 or age > 100:
            raise ValueError("Age must be between 18-100 years")

        base_rates = {
            "health": {"base": 3000, "factor": 0.02},
            "car": {"base": 2500, "factor": 0.015},
            "life": {"base": 2000, "factor": 0.01},
            "travel": {"base": 1500, "factor": 0.025}
        }

        if insurance_type.lower() not in base_rates:
            raise ValueError(f"Unsupported insurance type: {insurance_type}")

        rate = base_rates[insurance_type.lower()]
        age_factor = max(1, min(2, (age / 40)))
        final_quote = rate["base"] * age_factor

        return {
            "success": True,
            "data": {
                "insurance_type": insurance_type,
                "age": age,
                "quote_amount": f"₹{final_quote:,.2f}",
                "coverage_details": {
                    "base_premium": f"₹{rate['base']:,.2f}",
                    "age_factor": f"{age_factor:.2f}x",
                    "coverage_components": ["Hospitalization", "Accidental Death"] if insurance_type == "health" else
                    ["Third Party Liability", "Own Damage"] if insurance_type == "car" else
                    ["Term Coverage"] if insurance_type == "life" else
                    ["Trip Cancellation", "Medical Emergency"]
                },
                "valid_until": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            },
            "message": f"Quote generated for {insurance_type} insurance"
        }
    except ValueError as ve:
        raise ValueError(f"Validation error: {str(ve)}")
    except Exception as e:
        raise Exception(f"Failed to generate quote: {str(e)}")

@mcp.tool()
def check_policy_renewal(policy_number: str) -> Dict[str, Any]:
    """
    Checks comprehensive renewal status including premium due, grace period and benefits.

    Provides detailed policy renewal information including days until expiry, last premium paid,
    renewal premium amount, and any applicable grace period or late fees.

    Args:
        policy_number (str): Valid policy number (format: PB followed by 6 digits)

    Returns:
        Dict[str, Any]: Dictionary containing:
            - renewal_status: Current status (ACTIVE/EXPIRED/PENDING)
            - premium_details: Amount due and payment history
            - benefits: List of benefits that will continue after renewal

    Raises:
        ValueError: If policy number format is invalid
        Exception: For any system errors during status check
    """
    try:
        if not policy_number.startswith("PB") or not policy_number[2:].isdigit() or len(policy_number) != 8:
            raise ValueError("Policy number must be in format PBXXXXXX where X are digits")

        statuses = ["ACTIVE", "PENDING RENEWAL", "EXPIRED", "LAPSED"]
        days_to_expiry = randint(-30, 365)

        status = "EXPIRED" if days_to_expiry < 0 else \
            "PENDING RENEWAL" if days_to_expiry < 30 else "ACTIVE"

        return {
            "success": True,
            "data": {
                "policy_number": policy_number,
                "renewal_status": status,
                "days_to_expiry": max(0, days_to_expiry),
                "premium_details": {
                    "last_paid": f"₹{randint(1000, 5000)}",
                    "due_amount": f"₹{randint(1500, 5500)}",
                    "due_date": (datetime.now() + timedelta(days=max(0, days_to_expiry))).strftime("%Y-%m-%d"),
                    "grace_period": "15 days" if status == "PENDING RENEWAL" else "None"
                },
                "benefits": [
                    "No Claim Bonus",
                    "Loyalty Discount",
                    "Accumulated Benefits"
                ] if status != "EXPIRED" else []
            },
            "message": f"Renewal status for policy {policy_number}"
        }
    except ValueError as ve:
        raise ValueError(f"Policy validation error: {str(ve)}")
    except Exception as e:
        raise Exception(f"Renewal check failed: {str(e)}")


@mcp.tool()
def connect_to_agent(reason: str) -> Dict[str, Any]:
    """
    Initiates connection to human agent with priority routing based on reason.

    Routes the request to appropriate department (sales, claims, support) based on the reason
    provided, with estimated wait times and callback options.

    Args:
        reason (str): Detailed reason for connection (min 20 chars)

    Returns:
        Dict[str, Any]: Dictionary containing:
            - connection_id: Unique ticket ID
            - department: Assigned department
            - wait_time: Estimated wait in minutes
            - callback_options: Available callback slots

    Raises:
        ValueError: If reason is too short or unclear
        Exception: For connection system errors
    """
    try:
        if len(reason) < 20:
            raise ValueError("Please provide more details (minimum 20 characters)")

        departments = {
            "claim": "Claims Department",
            "premium": "Billing Department",
            "new": "Sales Department",
            "cancel": "Retention Department",
            "fraud": "Special Investigations"
        }

        assigned_dept = next((v for k, v in departments.items() if k in reason.lower()), "Customer Support")

        return {
            "success": True,
            "data": {
                "connection_id": f"CONN-{randint(10000, 99999)}",
                "status": "QUEUED",
                "department": assigned_dept,
                "estimated_wait_time": f"{randint(1, 15)} minutes",
                "callback_options": [
                    (datetime.now() + timedelta(minutes=30)).strftime("%H:%M"),
                    (datetime.now() + timedelta(hours=1)).strftime("%H:%M"),
                    (datetime.now() + timedelta(hours=2)).strftime("%H:%M")
                ],
                "reason": reason
            },
            "message": f"Connected to {assigned_dept} queue"
        }
    except ValueError as ve:
        raise ValueError(f"Connection error: {str(ve)}")
    except Exception as e:
        raise Exception(f"Connection failed: {str(e)}")


# Additional tools in the same format...

@mcp.tool()
def get_claim_settlement_ratio(plan_id: str) -> Dict[str, Any]:
    """
    Provides comprehensive claim settlement statistics including historical trends.

    Args:
        plan_id (str): Valid plan ID from available plans list

    Returns:
        Dict[str, Any]: Dictionary containing:
            - current_ratio: Current year settlement percentage
            - historical_trend: Last 5 years data
            - comparison: Industry benchmark comparison

    Raises:
        ValueError: For invalid plan IDs
        Exception: For data retrieval errors
    """
    try:
        if not plan_id.startswith(("health-", "car-", "life-")):
            raise ValueError("Invalid plan ID format")

        current = randint(85, 95)
        historical = {str(datetime.now().year - i): randint(80, 95) for i in range(5)}

        return {
            "success": True,
            "data": {
                "plan_id": plan_id,
                "current_ratio": f"{current}%",
                "historical_trend": historical,
                "comparison": {
                    "industry_average": f"{randint(75, 90)}%",
                    "rank": f"{randint(1, 10)}/100"
                }
            },
            "message": f"Claim statistics for {plan_id}"
        }
    except ValueError as ve:
        raise ValueError(f"Plan validation error: {str(ve)}")
    except Exception as e:
        raise Exception(f"Claim data unavailable: {str(e)}")


@mcp.tool()
def submit_insurance_application(
        plan: str,
        fullName: str,
        dob: str,
        photo: str,
        coverage: str,
        premium: str,
        familyDetails: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Processes complete insurance application with underwriting validations.

    Args:
        plan: Selected plan ID from available options
        fullName: Applicant's full legal name
        dob: Date of birth in YYYY-MM-DD format
        photo: Document reference for ID verification
        coverage: Selected coverage amount with currency
        premium: Calculated premium amount
        familyDetails: List of family members with relationships and ages

    Returns:
        Dict[str, Any]: Dictionary containing:
            - application_id: Unique reference number
            - underwriting_status: Current underwriting phase
            - next_steps: Required actions for completion
            - documents: List of required documents

    Raises:
        ValueError: For invalid application data
        Exception: For submission failures
    """
    try:
        # Validate DOB format
        datetime.strptime(dob, "%Y-%m-%d")

        if not familyDetails:
            raise ValueError("At least one family member required")

        policy_number = f"PB{randint(100000, 999999)}"

        return {
            "success": True,
            "data": {
                "application_id": f"APP-{datetime.now().timestamp()}",
                "policy_number": policy_number,
                "underwriting_status": "INITIAL_REVIEW",
                "next_steps": [
                    "Medical checkup (if applicable)",
                    "Document verification",
                    "Final approval"
                ],
                "documents_required": [
                    "Address proof",
                    "Income proof",
                    "Medical history"
                ],
                "applicant": fullName,
                "plan": plan,
                "coverage": coverage,
                "premium": premium,
                "family_count": len(familyDetails)
            },
            "message": f"Application received. Reference: {policy_number}"
        }
    except ValueError as ve:
        raise ValueError(f"Application validation error: {str(ve)}")
    except Exception as e:
        raise Exception(f"Submission failed: {str(e)}")




@mcp.tool()
def fetch_policy_document(policy_number: str) -> Dict[str, Any]:
    """
    Fetches the policy document PDF based on the policy number.

    Args:
        policy_number (str): The user's policy number.

    Returns:
        Dict[str, Any]: Contains success flag, document URL or message.
    """
    try:
        if not policy_number:
            raise ValueError("Policy number is required.")

        # Mock document link (replace with actual retrieval logic)
        document_url = f"https://example.com/policies/{policy_number}.pdf"

        return {
            "success": True,
            "data": {
                "policy_number": policy_number,
                "document_url": document_url
            },
            "message": "Policy document fetched successfully."
        }
    except Exception as e:
        raise Exception(f"Failed to fetch policy document: {str(e)}")


@mcp.tool()
def update_contact_info(email: str, phone: str = None) -> Dict[str, Any]:
    """
    Updates the user's contact information.

    Args:
        email (str): New email address.
        phone (str, optional): New phone number.

    Returns:
        Dict[str, Any]: Status of update operation.
    """
    try:
        if "@" not in email:
            raise ValueError("Invalid email address.")

        return {
            "success": True,
            "data": {
                "email": email,
                "phone": phone
            },
            "message": "Contact information updated successfully."
        }
    except Exception as e:
        raise Exception(f"Failed to update contact info: {str(e)}")


@mcp.tool()
def calculate_premium_estimate(insurance_type: str, coverage_amount: float, age: int) -> Dict[str, Any]:
    """
    Calculates a premium estimate based on insurance type, age, and coverage.

    Args:
        insurance_type (str): Type of insurance (health, car, life, etc.)
        coverage_amount (float): Desired coverage in INR.
        age (int): Age of the insured person.

    Returns:
        Dict[str, Any]: Estimated premium breakdown.
    """
    try:
        if age < 18 or age > 100:
            raise ValueError("Age must be between 18 and 100.")

        base_factors = {
            "health": 0.02,
            "car": 0.015,
            "life": 0.01
        }

        if insurance_type.lower() not in base_factors:
            raise ValueError("Unsupported insurance type.")

        factor = base_factors[insurance_type.lower()]
        premium = coverage_amount * factor * (1 + (age / 100))

        return {
            "success": True,
            "data": {
                "insurance_type": insurance_type,
                "age": age,
                "coverage_amount": coverage_amount,
                "estimated_premium": f"₹{premium:,.2f}"
            },
            "message": "Premium estimate calculated."
        }
    except Exception as e:
        raise Exception(f"Failed to calculate premium: {str(e)}")


@mcp.tool()
def get_available_plans(insurance_type: str) -> Dict[str, Any]:
    """
    Lists available insurance plans for a given insurance type.

    Args:
        insurance_type (str): Type of insurance (health, car, life, etc.)

    Returns:
        Dict[str, Any]: List of plan names and identifiers.
    """
    try:
        plans = {
            "health": ["health-basic", "health-plus", "health-premium"],
            "car": ["car-standard", "car-comprehensive"],
            "life": ["life-term", "life-whole", "life-endowment"]
        }

        if insurance_type.lower() not in plans:
            raise ValueError("Unsupported insurance type.")

        return {
            "success": True,
            "data": {
                "insurance_type": insurance_type,
                "plans": plans[insurance_type.lower()]
            },
            "message": f"Plans available for {insurance_type}"
        }
    except Exception as e:
        raise Exception(f"Failed to fetch plans: {str(e)}")