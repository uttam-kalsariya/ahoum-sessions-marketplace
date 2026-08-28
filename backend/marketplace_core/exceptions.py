from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """
    Standardizes error responses across all DRF views to ensure clean and predictable API contracts.
    
    Format:
    {
        "success": False,
        "message": "Human-friendly explanation",
        "detail": "...",
        "error": "...",
        "errors": { ... }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        message = "An error occurred."
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
            elif 'error' in response.data:
                message = str(response.data['error'])
            else:
                first_key = next(iter(response.data.keys()), None)
                first_val = response.data.get(first_key) if first_key else None
                if isinstance(first_val, list) and first_val:
                    message = f"{first_key}: {first_val[0]}" if first_key not in ['error', 'detail', 'message'] else str(first_val[0])
                elif first_val:
                    message = f"{first_key}: {first_val}" if first_key not in ['error', 'detail', 'message'] else str(first_val)
        elif isinstance(response.data, list) and response.data:
            message = str(response.data[0])

        detail_val = response.data.get('detail', message) if isinstance(response.data, dict) else message
        error_val = response.data.get('error', message) if isinstance(response.data, dict) else message

        response.data = {
            'success': False,
            'message': message,
            'detail': detail_val,
            'error': error_val,
            'errors': response.data
        }

    return response
