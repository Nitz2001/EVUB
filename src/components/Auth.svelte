<script>
    import { auth } from '../lib/api';
    import { token, userType } from '../stores/auth';
    
    let isLogin = true;
    let isAdmin = false;
    let clubLogo = null;
    let email = '';
    let password = '';
    let clubName = '';
    
    async function handleSubmit() {
      try {
        const response = isLogin 
          ? await auth.login(email, password)
          : await auth.register({
              email,
              pwd: password,
              isAdmin,
              ...(isAdmin && { clubName, clubLogo })
            });
        
        token.set(response.token);
        userType.set(isAdmin ? 'admin' : 'user');
        localStorage.setItem('token', response.token);
        localStorage.setItem('userType', isAdmin ? 'admin' : 'user');
      } catch (error) {
        alert(error.response?.data?.message || 'An error occurred');
      }
    }
    
    function handleLogoUpload(event) {
      clubLogo = event.target.files[0];
    }
  </script>
  
  <div class="auth-container">
    <div class="auth-box">
      <div class="toggle-buttons">
        <button class:active={isLogin} on:click={() => isLogin = true}>Login</button>
        <button class:active={!isLogin} on:click={() => isLogin = false}>Register</button>
      </div>
      
      <form on:submit|preventDefault={handleSubmit}>
        <div class="radio-group">
          <label>
            <input type="radio" bind:group={isAdmin} value={false}>
            User
          </label>
          <label>
            <input type="radio" bind:group={isAdmin} value={true}>
            Club Admin
          </label>
        </div>
        
        <input type="email" bind:value={email} placeholder="Email" required>
        <input type="password" bind:value={password} placeholder="Password" required>
        please also make userdashboard and admindashboard as per the initial prompt
        {#if isAdmin && !isLogin}
          <input type="text" bind:value={clubName} placeholder="Club Name" required>
          <input type="file" accept="image/*" on:change={handleLogoUpload} required>
        {/if}
        
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>
    </div>
  </div>
  
  <style>
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
    
    .auth-box {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }
    
    .toggle-buttons {
      display: flex;
      margin-bottom: 1rem;
    }
    
    .toggle-buttons button {
      flex: 1;
      padding: 0.5rem;
      border: none;
      background: none;
      cursor: pointer;
    }
    
    .toggle-buttons button.active {
      border-bottom: 2px solid #007bff;
      color: #007bff;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    input {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    button[type="submit"] {
      background: #007bff;
      color: white;
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .radio-group {
      display: flex;
      gap: 1rem;
    }
  </style>