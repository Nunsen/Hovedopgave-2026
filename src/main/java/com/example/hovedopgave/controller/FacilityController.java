package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.FacilityResponse;
import com.example.hovedopgave.dto.FacilityStatusUpdateRequest;
import com.example.hovedopgave.dto.ValidationErrorResponse;
import com.example.hovedopgave.service.FacilityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    public List<FacilityResponse> getAllFacilities() {
        return facilityService.getAllFacilities();
    }

    @PutMapping("/{facilityId}/status")
    public ResponseEntity<FacilityResponse> updateFacilityStatus(
            @PathVariable Integer facilityId,
            @RequestBody FacilityStatusUpdateRequest request
    ) {
        FacilityResponse response = facilityService.updateFacilityStatus(facilityId, request);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(FacilityService.FacilityValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(
            FacilityService.FacilityValidationException exception
    ) {
        ValidationErrorResponse response = new ValidationErrorResponse(exception.getMessage(), exception.getFieldErrors());
        return ResponseEntity.badRequest().body(response);
    }
}
