package com.example.doceditor.service;

import com.example.doceditor.config.JwtUtils;
import com.example.doceditor.model.User;
import com.example.doceditor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("testuser", "test@example.com", "encodedpassword");
        user.setId(1L);
    }

    @Test
    void registerUser_Success() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedpassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        User registered = userService.registerUser("testuser", "test@example.com", "password123");

        assertNotNull(registered);
        assertEquals("testuser", registered.getUsername());
        assertEquals("test@example.com", registered.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void registerUser_DuplicateUsername_ThrowsException() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> 
            userService.registerUser("testuser", "test@example.com", "password123")
        );
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginUser_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encodedpassword")).thenReturn(true);
        when(jwtUtils.generateJwtToken("testuser")).thenReturn("mock-jwt-token");

        Map<String, Object> result = userService.loginUser("testuser", "password123");

        assertNotNull(result);
        assertEquals("mock-jwt-token", result.get("token"));
        assertEquals("testuser", result.get("username"));
        assertEquals(1L, result.get("id"));
    }

    @Test
    void loginUser_InvalidPassword_ThrowsException() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "encodedpassword")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> 
            userService.loginUser("testuser", "wrongpassword")
        );
    }
}
