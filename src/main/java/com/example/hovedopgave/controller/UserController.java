package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.UserRegistrationRequest;
import com.example.hovedopgave.dto.UserRegistrationResponse;
import com.example.hovedopgave.dto.UserLoginRequest;
import com.example.hovedopgave.dto.UserLoginResponse;
import com.example.hovedopgave.dto.UserProfileResponse;
import com.example.hovedopgave.dto.UserProfileUpdateRequest;
import com.example.hovedopgave.dto.UserResetPasswordRequest;
import com.example.hovedopgave.dto.UserResetPasswordResponse;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.UserRepository;
import com.example.hovedopgave.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;

    public UserController(UserRepository userRepository, UserService userService) {
        this.userRepository = userRepository;
        this.userService = userService;
    }

    @GetMapping
    public List<User> getUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable Integer userId) {
        UserProfileResponse response = userService.getUserProfile(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> updateUserProfile(
            @PathVariable Integer userId,
            @RequestBody UserProfileUpdateRequest request
    ) {
        UserProfileResponse response = userService.updateUserProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}/profile")
    public ResponseEntity<Void> deleteUserProfile(@PathVariable Integer userId) {
        userService.deleteUserProfile(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register")
    public ResponseEntity<UserRegistrationResponse> registerUser(@RequestBody UserRegistrationRequest request) {
        UserRegistrationResponse response = userService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<UserLoginResponse> loginUser(@RequestBody UserLoginRequest request) {
        UserLoginResponse response = userService.loginUser(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<UserResetPasswordResponse> resetPassword(@RequestBody UserResetPasswordRequest request) {
        UserResetPasswordResponse response = userService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(UserService.UserValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(UserService.UserValidationException exception) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
