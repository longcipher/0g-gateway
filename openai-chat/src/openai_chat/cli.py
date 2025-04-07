from openai import OpenAI

def main():
    client = OpenAI(
    api_key="sk-1234",
    base_url="https://176f7ae0891796d17e505edcb4a9a5177bd59b4b-3000.dstack-prod5.phala.network/v1",
    )

    completion = client.chat.completions.create(
        model="phala/deepseek-r1-70b",
        messages=[
            {
                "role": "system",
                "content": "you are a helpful assistant that speaks Chinese.",
            },
            {"role": "user", "content": "Hello, from 0g user!"},
        ],
        temperature=0.9,
    )

    print(completion.choices[0].message.content)

if __name__ == "__main__":
    main()