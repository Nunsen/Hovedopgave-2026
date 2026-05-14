package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.FaqRequestCreateRequest;
import com.example.hovedopgave.dto.FaqRequestResponse;
import com.example.hovedopgave.dto.FaqRequestStatusUpdateRequest;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.service.FaqRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faq-requests")
public class FaqRequestController {

    private final FaqRequestService faqRequestService;

    public FaqRequestController(FaqRequestService faqRequestService) {
        this.faqRequestService = faqRequestService;
    }

    @GetMapping
    public List<FaqRequestResponse> getRequests() {
        return faqRequestService.getRequests();
    }

    @PostMapping
    public ResponseEntity<FaqRequestResponse> createRequest(@RequestBody FaqRequestCreateRequest request) {
        FaqRequestResponse response = faqRequestService.createRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{faqRequestId}/status")
    public ResponseEntity<FaqRequestResponse> updateStatus(
            @PathVariable Integer faqRequestId,
            @RequestBody FaqRequestStatusUpdateRequest request
    ) {
        FaqRequestResponse response = faqRequestService.updateStatus(faqRequestId, request);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(FaqRequestService.FaqRequestValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            FaqRequestService.FaqRequestValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
