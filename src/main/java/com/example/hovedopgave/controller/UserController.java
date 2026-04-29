package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.UserRegistrationRequest;
import com.example.hovedopgave.dto.UserRegistrationResponse;
import com.example.hovedopgave.dto.UserLoginRequest;
import com.example.hovedopgave.dto.UserLoginResponse;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.UserRepository;
import com.example.hovedopgave.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
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

    @ExceptionHandler(UserService.UserValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(UserService.UserValidationException exception) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
