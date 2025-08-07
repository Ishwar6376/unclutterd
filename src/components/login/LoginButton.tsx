import { useAuth0 } from '@auth0/auth0-react';

export default function LoginButtons() {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'login',  // 👈 forces login screen
      }
    });
  };

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup', // 👈 forces signup screen
      }
    });
  };

  return (
    <div>
      <button onClick={handleLogin}className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
      <button onClick={handleSignup}className="px-4 py-2 bg-blue-600 text-white rounded">Sign Up</button>
    </div>
  );
}
