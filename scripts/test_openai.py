import os
import openai

# Initialize OpenAI client
client = openai.OpenAI(
    api_key="")


def generate_gpt_response(user_message):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message}
        ]
    )
    return response.choices[0].message.content

# Test function


def test_generate_gpt_response():
    test_message = "Hello, how can you assist me today?"
    try:
        response = generate_gpt_response(test_message)
        print("Response from GPT-3.5-turbo:", response)
    except Exception as e:
        print("Error:", e)


if __name__ == "__main__":
    test_generate_gpt_response()
