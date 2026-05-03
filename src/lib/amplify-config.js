import { Amplify } from 'aws-amplify';

export const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
            userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
            signUpVerificationMethod: 'code',
            loginWith: {
                email: true,
            },
        },
    },
};

// Configure Amplify — ssr:true is omitted because all auth runs in client
// components; enabling it would cause Amplify to write cookies for server-side
// session hydration which conflicts with the Next.js App Router.
Amplify.configure(amplifyConfig);
