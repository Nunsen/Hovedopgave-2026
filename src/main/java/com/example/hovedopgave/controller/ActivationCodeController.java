package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.ActivationCodeRequest;
import com.example.hovedopgave.dto.ActivationCodeResponse;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.service.ActivationCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activation-codes")
public class ActivationCodeController {

    private final ActivationCodeService activationCodeService;

    public ActivationCodeController(ActivationCodeService activationCodeService) {
        this.activationCodeService = activationCodeService;
    }

    @PostMapping("/activate")
    public ResponseEntity<ActivationCodeResponse> activateUser(@RequestBody ActivationCodeRequest request) {
        return ResponseEntity.ok(activationCodeService.activateUser(request));
    }

    @ExceptionHandler(ActivationCodeService.ActivationCodeValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            ActivationCodeService.ActivationCodeValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
