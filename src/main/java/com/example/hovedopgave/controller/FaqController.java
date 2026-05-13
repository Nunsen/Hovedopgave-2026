package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.FaqResponse;
import com.example.hovedopgave.service.FaqService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/faqs")
public class FaqController {

    private final FaqService faqService;

    public FaqController(FaqService faqService) {
        this.faqService = faqService;
    }

    @GetMapping
    public List<FaqResponse> getFaqs() {
        return faqService.getFaqs();
    }
}
